"""Download NASA FIRMS data and build the Delta Fire Calendar evidence base.

The pipeline keeps three ideas separate:

* observed hotspot detections (raw FIRMS rows),
* coverage/completeness of the input archive, and
* a multiplicative harmonisation estimate that is only used where a
  train/test validation supports it.

All outputs are written to ``data/processed``.  The web application reads
those outputs; it never silently invents a value for a missing month.
"""

import argparse
import calendar
import csv
import json
import math
import os
import re
import statistics
import sys
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'data' / 'raw' / 'firms'
OUTPUT = ROOT / 'data' / 'processed'
BASE = 'https://firms.modaps.eosdis.nasa.gov'
BOUNDS = (29.5, 29.8, 32.5, 31.65)  # west, south, east, north; pilot rectangle
CUTOFF = date(2026, 11, 13)  # last completed UTC day considered by the downloader
ANNUAL = {'modis': 2000, 'viirs-snpp': 2012, 'viirs-jpss1': 2018}
API = {'modis': 'MODIS', 'viirs-snpp': 'VIIRS_SNPP', 'viirs-jpss1': 'VIIRS_NOAA20'}
PLATFORM_START = {'terra': date(2000, 11, 1), 'aqua': date(2002, 7, 1),
                  'snpp': date(2012, 1, 20), 'noaa20': date(2018, 4, 1)}
PLATFORM_PRODUCT = {'terra': 'MODIS', 'aqua': 'MODIS', 'snpp': 'VIIRS S-NPP',
                    'noaa20': 'VIIRS NOAA-20'}
REQUIRED = {'latitude', 'longitude', 'acq_date', 'acq_time', 'satellite', 'instrument'}
ONE_DAY = timedelta(days=1)

# The first four are the areas for which calibration is tested at the same
# scale as the decision.  A custom rectangle is deliberately not in this list.
AREA_PRESETS = [
    ('full', 'Full Nile Delta', BOUNDS),
    ('west', 'Western Delta', (29.5, 29.8, 31.0, 31.65)),
    ('east', 'Eastern Delta', (31.0, 29.8, 32.5, 31.65)),
    ('south', 'Southern Delta', (29.5, 29.8, 32.5, 30.7)),
    ('north', 'Northern Delta', (29.5, 30.7, 32.5, 31.65)),
]

TRAIN_TEST = {
    'terra': ((2013, 2022), (2023, 2025)),
    'aqua': ((2013, 2022), (2023, 2025)),
    'snpp': ((2013, 2022), (2023, 2025)),
    'noaa20': ((2019, 2022), (2023, 2025)),
}


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if not REQUIRED.issubset(reader.fieldnames or []):
            raise ValueError(f'{path.name}: FIRMS CSV header missing or invalid')
        return list(reader)


def fetch(url):
    for attempt in range(3):
        try:
            request = Request(url, headers={'User-Agent': 'DeltaFireCalendar/1.0'})
            with urlopen(request, timeout=18) as response:
                return response.read()
        except HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise RuntimeError(f'HTTP {exc.code}') from None
        except OSError:
            if attempt == 2:
                raise RuntimeError('network error connecting to FIRMS') from None
        time.sleep(2 ** attempt)


def get_file(path, url):
    if path.is_file():
        read_csv(path)
        return 'cached'
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.part')
    try:
        temporary.write_bytes(fetch(url))
        rows = read_csv(temporary)
        if path.parent.name == 'annual_egypt' and not rows:
            raise ValueError('Unexpected empty annual file; check the FIRMS catalog')
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    return 'downloaded'


def attempt(path, url):
    try:
        state = get_file(path, url)
        result = {'file': path.name, 'status': state}
    except (RuntimeError, ValueError, OSError, UnicodeError) as exc:
        result = {'file': path.name, 'status': 'failed', 'error': str(exc)}
    print(f"{result['status']:>10} {path.name}", flush=True)
    return result


def preflight(url):
    # Check connectivity once so an offline run does not retry each archive year.
    request = Request(url, method='HEAD')
    try:
        with urlopen(request, timeout=8):
            pass
    except HTTPError:
        pass  # Server reached. Individual GETs can report their own status.


def download(from_year, to_year, key):
    annual = []
    for archive, first_year in ANNUAL.items():
        for year in range(max(first_year, from_year), min(2025, to_year) + 1):
            name = f'{archive}_{year}_Egypt.csv'
            annual.append((RAW / 'annual_egypt' / name, f'{BASE}/data/country/{archive}/{year}/{name}'))
    jobs = list(annual)
    needs_recent = from_year <= 2026 <= to_year
    records = []
    try:
        if any(not path.exists() for path, _ in annual) or (needs_recent and key):
            preflight(f'{BASE}/download/')
    except OSError:
        for path, url in annual:
            records.append(attempt(path, url) if path.exists() else
                           {'file': path.name, 'status': 'failed', 'error': 'FIRMS network unavailable'})
        if needs_recent:
            records.append({'file': '2026', 'status': 'failed', 'error': 'FIRMS network unavailable'})
        return records

    if needs_recent and not key:
        records.append({'file': '2026', 'status': 'skipped', 'error': 'Optional FIRMS_MAP_KEY was absent'})
    elif needs_recent:
        secret = quote(key, safe='')
        try:
            rows = csv.DictReader(fetch(f'{BASE}/api/data_availability/csv/{secret}/all').decode('utf-8-sig').splitlines())
            published = {row['data_id']: (date.fromisoformat(row['min_date']), date.fromisoformat(row['max_date']))
                         for row in rows if row.get('min_date') and row.get('max_date')}
            if not published.keys() & {f'{product}_SP' for product in API.values()}:
                raise ValueError('FIRMS availability response has no usable Standard Processing dates')
            extent = ','.join(map(str, BOUNDS))
            for archive, product in API.items():
                for quality in ('SP', 'NRT'):
                    source = f'{product}_{quality}'
                    if source not in published:
                        records.append({'file': source, 'status': 'unavailable', 'error': 'No published date range'})
                        continue
                    first, last = published[source]
                    cursor, end = max(date(2026, 1, 1), first), min(CUTOFF, last)
                    if quality == 'NRT' and f'{product}_SP' in published:
                        cursor = max(cursor, published[f'{product}_SP'][1] + ONE_DAY)
                    while cursor <= end:
                        days = min((end - cursor).days + 1, 5)
                        final_day = cursor + timedelta(days=days - 1)
                        name = f'{archive}_{quality}_{cursor}_{final_day}.csv'
                        jobs.append((RAW / 'archive_2026' / name,
                                     f'{BASE}/api/area/csv/{secret}/{source}/{extent}/{days}/{cursor}'))
                        cursor = final_day + ONE_DAY
        except (RuntimeError, ValueError, KeyError, UnicodeError) as exc:
            records.append({'file': '2026', 'status': 'failed', 'error': str(exc)})
    with ThreadPoolExecutor(max_workers=4) as pool:
        records.extend(pool.map(lambda job: attempt(*job), jobs))
    return records


def write_csv(name, fields, rows):
    with (OUTPUT / name).open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.writer(stream)
        writer.writerow(fields)
        writer.writerows(rows)


def date_span(first, last):
    return {first + timedelta(days=i) for i in range((last - first).days + 1)}


def platform_for(archive, raw_satellite):
    token = raw_satellite.strip().lower()
    if archive == 'modis':
        return {'t': 'terra', 'terra': 'terra', 'a': 'aqua', 'aqua': 'aqua'}.get(token)
    return {'viirs-snpp': 'snpp', 'viirs-jpss1': 'noaa20'}[archive]


def parse_file(path):
    annual = re.fullmatch(r'(modis|viirs-snpp|viirs-jpss1)_(\d{4})_Egypt\.csv', path.name)
    if annual:
        archive, year = annual.groups()
        return archive, 'SP', date(int(year), 1, 1), date(int(year), 12, 31), True
    recent = re.fullmatch(r'(modis|viirs-snpp|viirs-jpss1)_(SP|NRT)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.csv', path.name)
    if recent:
        archive, quality, start, end = recent.groups()
        return archive, quality, date.fromisoformat(start), date.fromisoformat(end), False
    raise ValueError(f'Unexpected input filename: {path.name}')


def cell_center(x, y):
    return x + 0.125, y + 0.125


def cell_in_bounds(x, y, bounds):
    west, south, east, north = bounds
    lon, lat = cell_center(x, y)
    return west <= lon <= east and south <= lat <= north


def month_key(d, month):
    return f'{d.year:04d}-{month:02d}'


def fit_stats(source, target, months, train, test):
    """Fit a ratio on training months and evaluate on separate test years."""
    train_months = [m for m in months if train[0] <= int(m[:4]) <= train[1] and m in source and m in target]
    test_months = [m for m in months if test[0] <= int(m[:4]) <= test[1] and m in source and m in target]
    if len(train_months) < 24 or len(test_months) < 12:
        return {'train_months': len(train_months), 'test_months': len(test_months),
                'factor': None, 'mae_raw': None, 'mae_adjusted': None,
                'bias_raw': None, 'bias_adjusted': None, 'status': 'insufficient_overlap'}
    baseline = sum(source[m] for m in train_months)
    if not baseline:
        return {'train_months': len(train_months), 'test_months': len(test_months),
                'factor': None, 'mae_raw': None, 'mae_adjusted': None,
                'bias_raw': None, 'bias_adjusted': None, 'status': 'zero_training_total'}
    factor = sum(target[m] for m in train_months) / baseline
    errors_before = [source[m] - target[m] for m in test_months]
    errors_after = [factor * source[m] - target[m] for m in test_months]
    mae_before = statistics.mean(abs(error) for error in errors_before)
    mae_after = statistics.mean(abs(error) for error in errors_after)
    return {'train_months': len(train_months), 'test_months': len(test_months),
            'factor': factor, 'mae_raw': mae_before, 'mae_adjusted': mae_after,
            'bias_raw': statistics.mean(errors_before),
            'bias_adjusted': statistics.mean(errors_after),
            'status': 'mae_improved' if mae_after < mae_before else 'mae_not_improved'}


def fmt(value, places=6):
    if value is None or value == '':
        return ''
    if isinstance(value, float):
        return round(value, places)
    return value


def loo_folds(platform, source_counts, target_counts, dev_start, dev_end, metric):
    """Whole-year leave-one-out folds over the development overlap period."""
    common = sorted(m for m in source_counts if m in target_counts
                    and dev_start <= int(m[:4]) <= dev_end)
    folds = []
    for year in range(dev_start, dev_end + 1):
        train = [m for m in common if int(m[:4]) != year]
        test = [m for m in common if int(m[:4]) == year]
        if not test:
            continue
        source_total = sum(source_counts[m] for m in train)
        target_total = sum(target_counts[m] for m in train)
        if not source_total:
            continue
        factor = target_total / source_total
        raw = [source_counts[m] - target_counts[m] for m in test]
        adj = [factor * source_counts[m] - target_counts[m] for m in test]
        sep = [m for m in test if m[-2:] in ('09', '10')]
        sep_raw = [source_counts[m] - target_counts[m] for m in sep]
        sep_adj = [factor * source_counts[m] - target_counts[m] for m in sep]
        folds.append([platform, metric, year, len(test), fmt(factor),
                      fmt(statistics.mean(abs(x) for x in raw), 2),
                      fmt(statistics.mean(abs(x) for x in adj), 2),
                      fmt(statistics.mean(raw), 2), fmt(statistics.mean(adj), 2),
                      len(sep),
                      fmt(statistics.mean(abs(x) for x in sep_raw), 2) if sep_raw else '',
                      fmt(statistics.mean(abs(x) for x in sep_adj), 2) if sep_adj else ''])
    return folds


def profile():
    inventory = []
    month = Counter()
    cell_months = Counter()
    cell_days_month = Counter()
    cell_days_cells = Counter()
    cell_day_keys = set()
    cell_days_by_platform = defaultdict(set)
    observations = defaultdict(set)
    quality = Counter()
    possible_days = defaultdict(set)
    present_rows = set()
    lineage_rows = Counter()
    lineage_dates = defaultdict(lambda: [None, None])
    archive_satellites = defaultdict(set)
    version_year = Counter()
    version_monthly = Counter()
    first_detection = {}
    last_detection = {}
    west, south, east, north = BOUNDS
    files = sorted(RAW.glob('annual_egypt/*.csv')) + sorted(RAW.glob('archive_2026/*.csv'),
                                                            key=lambda path: ('_NRT_' in path.name, path.name))
    loaded_products = set()

    detection_path = OUTPUT / 'detections_delta.csv'
    detection_fields = ['platform', 'acq_date', 'acq_time_utc', 'latitude', 'longitude',
                        'satellite', 'instrument', 'confidence', 'frp_mw', 'daynight', 'type',
                        'version', 'scan_km', 'track_km', 'brightness_k', 'bright_t31_k',
                        'cell_west', 'cell_south', 'source_file', 'processing',
                        'eligible_type0_sp']
    detection_stream = detection_path.open('w', encoding='utf-8-sig', newline='')
    detection_writer = csv.writer(detection_stream)
    detection_writer.writerow(detection_fields)
    detection_count = 0

    for path in files:
        archive, processing, first, last, is_annual = parse_file(path)
        loaded_products.add(archive)
        rows = read_csv(path)
        file_dates = []
        missing = Counter()
        delta_total = used = skipped = 0
        for row in rows:
            try:
                lat, lon = float(row['latitude']), float(row['longitude'])
                when = date.fromisoformat(row['acq_date'])
                hour_text = row['acq_time'].zfill(4)
                if len(hour_text) != 4 or not hour_text.isdigit() or int(hour_text[:2]) >= 24 or int(hour_text[2:]) >= 60:
                    raise ValueError('Invalid UTC time')
                platform = platform_for(archive, row['satellite'])
                if not platform or not first <= when <= last or not math.isfinite(lat) or not math.isfinite(lon):
                    raise ValueError('Invalid platform, date, or coordinates')
            except (ValueError, TypeError, AttributeError):
                skipped += 1
                continue
            file_dates.append(when)
            if not (west <= lon <= east and south <= lat <= north):
                continue
            delta_total += 1
            for field, value in row.items():
                if field and (value is None or not value.strip()):
                    missing[field] += 1
            detection = (platform, when, hour_text, lat, lon)
            if detection in present_rows:
                quality[(platform, processing, 'duplicate_point_time', '')] += 1
                continue
            present_rows.add(detection)
            detection_type = (row.get('type') or '').strip()
            confidence = (row.get('confidence') or '').strip().lower()
            version = (row.get('version') or '').strip()
            quality[(platform, processing, 'type', detection_type or 'missing')] += 1
            quality[(platform, processing, 'confidence', confidence or 'missing')] += 1
            quality[(platform, processing, 'daynight', row.get('daynight') or 'missing')] += 1
            quality[(platform, processing, 'utc_hour', hour_text[:2])] += 1
            for metric, fields, positive in (('frp_mw', ('frp',), False),
                                             ('pixel_area_proxy_km2', ('scan', 'track'), True)):
                try:
                    values = [float(row.get(field) or '') for field in fields]
                except ValueError:
                    continue
                if all(math.isfinite(value) and (value > 0 if positive else value >= 0) for value in values):
                    observations[(platform, processing, metric)].add((detection, math.prod(values)))

            x, y = math.floor(lon * 4) / 4, math.floor(lat * 4) / 4
            lineage_rows[(archive, processing, version or 'missing')] += 1
            bounds = lineage_dates[(archive, processing, version or 'missing')]
            bounds[0] = when if bounds[0] is None or when < bounds[0] else bounds[0]
            bounds[1] = when if bounds[1] is None or when > bounds[1] else bounds[1]
            archive_satellites[archive].add((row.get('satellite') or '').strip())
            first_detection[platform] = when if platform not in first_detection or when < first_detection[platform] else first_detection[platform]
            last_detection[platform] = when if platform not in last_detection or when > last_detection[platform] else last_detection[platform]

            eligible = processing == 'SP' and not version.upper().endswith('NRT') and detection_type == '0'
            detection_writer.writerow([
                platform, when.isoformat(), hour_text, lat, lon,
                row.get('satellite') or '', row.get('instrument') or '',
                row.get('confidence') or '', row.get('frp') or '', row.get('daynight') or '',
                detection_type, version, row.get('scan') or '', row.get('track') or '',
                row.get('brightness') or row.get('bright_ti4') or '',
                row.get('bright_t31') or row.get('bright_ti5') or '',
                x, y, path.relative_to(ROOT).as_posix(), processing, 1 if eligible else 0,
            ])
            detection_count += 1

            if not eligible:
                continue
            used += 1
            ym = when.strftime('%Y-%m')
            version_year[(platform, when.year, version or 'missing')] += 1
            version_monthly[(platform, ym, version or 'missing')] += 1
            month[(platform, ym)] += 1
            cell_months[(platform, ym, x, y)] += 1
            cell_day = (platform, when, x, y)
            if cell_day not in cell_day_keys:
                cell_day_keys.add(cell_day)
                cell_days_month[(platform, ym)] += 1
                cell_days_cells[(platform, ym, x, y)] += 1
                cell_days_by_platform[platform].add((when, x, y))

        platforms = ('terra', 'aqua') if archive == 'modis' else (platform_for(archive, ''),)
        # Coverage comes from the declared archive window, not from the first
        # detection date.  A month with no detection is still a complete month
        # when the sensor was operating and the archive covers every day.
        if processing == 'SP':
            coverage_first = date(first.year, 1, 1) if is_annual else first
            coverage_last = date(last.year, 12, 31) if is_annual else last
            for platform in platforms:
                start = max(coverage_first, PLATFORM_START[platform])
                finish = min(coverage_last, CUTOFF)
                if platform == 'snpp':
                    finish = min(finish, date(2026, 11, 2))
                if start <= finish:
                    possible_days[platform].update(date_span(start, finish))
        inventory.append([path.relative_to(ROOT).as_posix(), archive, processing,
                          'Egypt' if is_annual else 'Delta bbox', len(rows), delta_total, used, skipped,
                          min(file_dates, default=''), max(file_dates, default=''),
                          '|'.join(rows[0]) if rows else '|'.join(path.read_text(encoding='utf-8-sig').splitlines()[0].split(',')),
                          json.dumps(missing, sort_keys=True)])
    detection_stream.close()

    if not inventory:
        print('No FIRMS CSVs found. No observational results were generated.', file=sys.stderr)
        return False

    write_csv('inventory.csv', ['file', 'product', 'processing', 'area', 'source_rows', 'delta_rows',
                                'eligible_delta_rows', 'invalid_rows', 'first_row_date', 'last_row_date',
                                'columns', 'delta_missing_by_column'], inventory)
    write_csv('quality_counts.csv', ['platform', 'processing', 'field', 'value', 'observations'],
              ((*key, value) for key, value in sorted(quality.items())))
    distributions = []
    for (platform, processing, metric), values in sorted(observations.items()):
        numbers = sorted(value for _, value in values)
        distributions.append([platform, processing, metric, len(numbers), numbers[0],
                              statistics.median(numbers), numbers[math.ceil(.9 * len(numbers)) - 1], numbers[-1]])
    write_csv('measurement_distribution.csv', ['platform', 'processing', 'metric', 'n', 'min', 'median', 'p90', 'max'], distributions)

    grid_keys = set(cell_months) | set(cell_days_cells)
    grid_rows = [[platform, ym, x, y, cell_months.get((platform, ym, x, y), 0),
                  cell_days_cells.get((platform, ym, x, y), 0)]
                 for platform, ym, x, y in sorted(grid_keys)]
    write_csv('grid_monthly.csv', ['platform', 'month', 'west', 'south', 'type_0_rows', 'cell_days'], grid_rows)

    month_rows = []
    complete = defaultdict(dict)
    for platform, platform_start in PLATFORM_START.items():
        archive = {'terra': 'modis', 'aqua': 'modis', 'snpp': 'viirs-snpp', 'noaa20': 'viirs-jpss1'}[platform]
        if archive not in loaded_products:
            continue
        dates = possible_days[platform]
        for year in range(platform_start.year, CUTOFF.year + 1):
            for number in range(1, 13):
                first_day = date(year, number, 1)
                if first_day > CUTOFF or first_day.replace(day=calendar.monthrange(year, number)[1]) < platform_start:
                    continue
                days = date_span(first_day, first_day.replace(day=calendar.monthrange(year, number)[1]))
                ym = first_day.strftime('%Y-%m')
                available = len(days & dates)
                status = 'full_input_date_range' if available == len(days) else 'partial_input_date_range' if available else 'input_missing'
                count = month[(platform, ym)] if available else ''
                cell_days = cell_days_month[(platform, ym)] if available else ''
                month_rows.append([platform, ym, count, cell_days, available, len(days), status])
                if status == 'full_input_date_range':
                    complete[platform][ym] = count
    write_csv('monthly_raw.csv', ['platform', 'month', 'type_0_rows', 'cell_days', 'input_days',
                                  'days_in_month', 'input_status'], month_rows)

    season = defaultdict(list)
    for platform, months in complete.items():
        for ym, n in months.items():
            season[(platform, ym[-2:])].append(n)
    write_csv('seasonal_profile.csv', ['platform', 'calendar_month', 'months_available', 'median', 'min', 'max'],
              ((*key, len(values), statistics.median(values), min(values), max(values))
               for key, values in sorted(season.items())))

    aqua_days = cell_days_by_platform['aqua']
    snpp_days = cell_days_by_platform['snpp']
    comparable_dates = possible_days['aqua'] & possible_days['snpp']
    agreement = Counter()
    for day, x, y in aqua_days | snpp_days:
        if day in comparable_dates:
            pair = (day, x, y)
            label = 'both' if pair in aqua_days and pair in snpp_days else 'aqua_only' if pair in aqua_days else 'snpp_only'
            agreement[(day.strftime('%Y-%m'), x, y, label)] += 1
    write_csv('sensor_disagreement.csv', ['month', 'west', 'south', 'observed_in', 'cell_days'],
              ((*key, value) for key, value in sorted(agreement.items())))

    # Calibration: raw hotspot counts are the primary metric.  Cell-days are a
    # sensitivity check because VIIRS often reports several pixels per fire.
    primary = {}
    sensitivity = []
    factors = {}
    for platform in ('terra', 'aqua', 'noaa20'):
        train, test = TRAIN_TEST[platform]
        months = sorted(complete[platform].keys() & complete['snpp'].keys())
        result = fit_stats(complete[platform], complete['snpp'], months, train, test)
        if result['status'] == 'mae_improved':
            factors[platform] = result['factor']
        primary[platform] = result
        sensitivity.append(['hotspot_count', platform, result['train_months'], result['test_months'],
                            fmt(result['factor']), fmt(result['mae_raw'], 2), fmt(result['mae_adjusted'], 2),
                            fmt(result['bias_raw'], 2), fmt(result['bias_adjusted'], 2), result['status']])
        cd_source = {m: cell_days_month[(platform, m)] for m in complete[platform]}
        cd_target = {m: cell_days_month[('snpp', m)] for m in complete['snpp']}
        cd_result = fit_stats(cd_source, cd_target, months, train, test)
        sensitivity.append(['cell_day', platform, cd_result['train_months'], cd_result['test_months'],
                            fmt(cd_result['factor']), fmt(cd_result['mae_raw'], 2), fmt(cd_result['mae_adjusted'], 2),
                            fmt(cd_result['bias_raw'], 2), fmt(cd_result['bias_adjusted'], 2), cd_result['status']])
    write_csv('calibration_baseline.csv', ['source', 'train_months', 'test_months', 'factor', 'mae_raw', 'mae_adjusted',
                                          'bias_raw', 'bias_adjusted', 'status'],
              ([platform] + [primary[platform]['train_months'], primary[platform]['test_months'],
                             fmt(primary[platform]['factor']), fmt(primary[platform]['mae_raw'], 2),
                             fmt(primary[platform]['mae_adjusted'], 2), fmt(primary[platform]['bias_raw'], 2),
                             fmt(primary[platform]['bias_adjusted'], 2), primary[platform]['status']]
               for platform in ('terra', 'aqua', 'noaa20')))
    write_csv('calibration_sensitivity.csv', ['metric', 'source', 'train_months', 'test_months', 'factor',
                                              'mae_raw', 'mae_adjusted', 'bias_raw', 'bias_adjusted', 'status'],
              sensitivity)

    # Error by held-out year and by calendar month: the autumn peak is the
    # period the Delta calendar is for, so it must not be hidden in an average.
    by_year = []
    by_month = []
    for platform in ('terra', 'aqua', 'noaa20'):
        result = primary[platform]
        if result['factor'] is None:
            continue
        factor = result['factor']
        months = sorted(complete[platform].keys() & complete['snpp'].keys())
        for year in range(TRAIN_TEST[platform][1][0], TRAIN_TEST[platform][1][1] + 1):
            subset = [m for m in months if int(m[:4]) == year]
            if not subset:
                continue
            before = [complete[platform][m] - complete['snpp'][m] for m in subset]
            after = [factor * complete[platform][m] - complete['snpp'][m] for m in subset]
            autumn = [m for m in subset if m[-2:] in ('09', '10')]
            before_a = [complete[platform][m] - complete['snpp'][m] for m in autumn]
            after_a = [factor * complete[platform][m] - complete['snpp'][m] for m in autumn]
            by_year.append([platform, year, len(subset), fmt(statistics.mean(abs(x) for x in before), 2),
                            fmt(statistics.mean(abs(x) for x in after), 2),
                            fmt(statistics.mean(before), 2), fmt(statistics.mean(after), 2),
                            len(autumn), fmt(statistics.mean(abs(x) for x in before_a), 2) if before_a else '',
                            fmt(statistics.mean(abs(x) for x in after_a), 2) if after_a else '',
                            fmt(statistics.mean(before_a), 2) if before_a else '',
                            fmt(statistics.mean(after_a), 2) if after_a else ''])
        for number in range(1, 13):
            subset = [m for m in months if int(m[-2:]) == number and TRAIN_TEST[platform][1][0] <= int(m[:4]) <= TRAIN_TEST[platform][1][1]]
            if not subset:
                continue
            before = [complete[platform][m] - complete['snpp'][m] for m in subset]
            after = [factor * complete[platform][m] - complete['snpp'][m] for m in subset]
            by_month.append([platform, f'{number:02d}', len(subset), fmt(statistics.mean(abs(x) for x in before), 2),
                             fmt(statistics.mean(abs(x) for x in after), 2),
                             fmt(statistics.mean(before), 2), fmt(statistics.mean(after), 2)])
    write_csv('calibration_by_year.csv', ['source', 'test_year', 'test_months', 'mae_raw', 'mae_adjusted',
                                         'bias_raw', 'bias_adjusted', 'sep_oct_months', 'sep_oct_mae_raw',
                                         'sep_oct_mae_adjusted', 'sep_oct_bias_raw', 'sep_oct_bias_adjusted'], by_year)
    write_csv('calibration_by_month.csv', ['source', 'calendar_month', 'test_months', 'mae_raw', 'mae_adjusted',
                                          'bias_raw', 'bias_adjusted'], by_month)

    # Whole-year leave-one-out folds within the development overlap: compare the
    # count factor against the cell-day factor to confirm the primary metric.
    loo = []
    for platform in ('terra', 'aqua', 'noaa20'):
        dev_start, dev_end = (2012, 2025) if platform in ('terra', 'aqua') else (2018, 2025)
        src_count = {m: complete[platform][m] for m in complete[platform]}
        tgt_count = {m: complete['snpp'][m] for m in complete['snpp']}
        loo += loo_folds(platform, src_count, tgt_count, dev_start, dev_end, 'hotspot_count')
        src_cd = {m: cell_days_month[(platform, m)] for m in complete[platform]}
        tgt_cd = {m: cell_days_month[('snpp', m)] for m in complete['snpp']}
        loo += loo_folds(platform, src_cd, tgt_cd, dev_start, dev_end, 'cell_day')
    write_csv('calibration_loofolds.csv', ['source', 'metric', 'fold_year', 'test_months',
                                           'factor', 'mae_raw', 'mae_adjusted', 'bias_raw',
                                           'bias_adjusted', 'sep_oct_months', 'sep_oct_mae_raw',
                                           'sep_oct_mae_adjusted'], loo)

    # Spatial validation: how far does the full-Delta factor transfer to the
    # four quadrants?  A large spread is a reason to show raw values for a
    # custom selection instead of applying the full-area factor.
    spatial = []
    area_factors = {}
    area_counts = {}
    area_cell_days = {}
    for area_id, area_name, bounds in AREA_PRESETS:
        for platform in ('terra', 'aqua', 'noaa20'):
            source = defaultdict(int)
            target = defaultdict(int)
            for (p, ym, x, y), value in cell_months.items():
                if p in (platform, 'snpp') and cell_in_bounds(x, y, bounds):
                    if p == platform:
                        source[ym] += value
                    else:
                        target[ym] += value
            source_days = defaultdict(int)
            target_days = defaultdict(int)
            for (p, when, x, y) in cell_day_keys:
                if p in (platform, 'snpp') and cell_in_bounds(x, y, bounds):
                    key = when.strftime('%Y-%m')
                    if p == platform:
                        source_days[key] += 1
                    else:
                        target_days[key] += 1
            months = sorted(complete[platform].keys() & complete['snpp'].keys())
            for ym in complete[platform]:
                source.setdefault(ym, 0)
            for ym in complete['snpp']:
                target.setdefault(ym, 0)
            result = fit_stats(source, target, months, *TRAIN_TEST[platform])
            area_counts[(area_id, platform)] = source
            area_cell_days[(area_id, platform)] = source_days
            if result['status'] == 'mae_improved':
                area_factors[(area_id, platform)] = result['factor']
            spatial.append([area_id, area_name, f'{bounds[0]},{bounds[1]},{bounds[2]},{bounds[3]}',
                            platform, result['train_months'], result['test_months'], fmt(result['factor']),
                            fmt(result['mae_raw'], 2), fmt(result['mae_adjusted'], 2),
                            fmt(result['bias_raw'], 2), fmt(result['bias_adjusted'], 2), result['status']])
    # The reference platform is not calibrated against itself, but its area
    # counts are still needed for the calendar and for the app.
    for area_id, area_name, bounds in AREA_PRESETS:
        snpp_counts = defaultdict(int)
        snpp_days = defaultdict(int)
        for (p, ym, x, y), value in cell_months.items():
            if p == 'snpp' and cell_in_bounds(x, y, bounds):
                snpp_counts[ym] += value
        for (p, when, x, y) in cell_day_keys:
            if p == 'snpp' and cell_in_bounds(x, y, bounds):
                snpp_days[when.strftime('%Y-%m')] += 1
        for ym in complete['snpp']:
            snpp_counts.setdefault(ym, 0)
            snpp_days.setdefault(ym, 0)
        area_counts[(area_id, 'snpp')] = snpp_counts
        area_cell_days[(area_id, 'snpp')] = snpp_days
    write_csv('calibration_spatial.csv', ['area_id', 'area_name', 'bounds', 'source', 'train_months',
                                          'test_months', 'factor', 'mae_raw', 'mae_adjusted', 'bias_raw',
                                          'bias_adjusted', 'status'], spatial)

    # A tidy long table for the app.  It keeps raw values available even when
    # the month is partial or the calibration failed.
    area_monthly = []
    for area_id, area_name, bounds in AREA_PRESETS:
        for platform, ym, raw, cell_days, input_days, days_in_month, input_status in month_rows:
            if input_status == 'input_missing':
                raw_value = ''
                cd_value = ''
            else:
                raw_value = area_counts.get((area_id, platform), {}).get(ym, 0)
                cd_value = area_cell_days.get((area_id, platform), {}).get(ym, 0)
            factor = 1.0 if platform == 'snpp' else area_factors.get((area_id, platform))
            if input_status == 'full_input_date_range' and factor is not None:
                harmonized = raw_value if platform == 'snpp' else round(raw_value * factor, 6)
                value_kind = 'observed' if platform == 'snpp' else 'estimated'
                calibration_status = 'reference' if platform == 'snpp' else 'validated'
                if platform == 'snpp':
                    estimate_status = 'observed'
                elif int(ym[:4]) >= 2013:
                    estimate_status = 'validated_period'
                else:
                    estimate_status = 'extrapolated'
            else:
                harmonized = ''
                value_kind = 'unavailable'
                if platform == 'snpp':
                    calibration_status = 'reference'
                elif (area_id, platform) in area_factors:
                    calibration_status = 'validated'
                else:
                    result = next((row for row in spatial if row[0] == area_id and row[3] == platform), None)
                    calibration_status = result[-1] if result else 'not_available'
                if input_status == 'input_missing':
                    estimate_status = 'missing_input'
                elif input_status == 'partial_input_date_range':
                    estimate_status = 'partial_input'
                else:
                    estimate_status = 'raw_only'
            area_monthly.append([area_id, area_name, f'{bounds[0]},{bounds[1]},{bounds[2]},{bounds[3]}',
                                 platform, ym, raw_value, cd_value, fmt(factor), fmt(harmonized, 2),
                                 value_kind, calibration_status, estimate_status, input_status,
                                 input_days, days_in_month])
    write_csv('area_monthly.csv', ['area_id', 'area_name', 'bounds', 'platform', 'month', 'raw_hotspots',
                                   'cell_days', 'factor', 'harmonized_hotspots', 'value_kind',
                                   'calibration_status', 'estimate_status', 'input_status',
                                   'input_days', 'days_in_month'], area_monthly)

    # The original full-Delta series is retained as a convenient download.
    monthly = {(platform, month): (count, cell_days, input_days, status)
               for platform, month, count, cell_days, input_days, _, status in month_rows}
    harmonized_rows = []
    for year in range(2000, 2026):
        for number in range(11 if year == 2000 else 1, 13):
            label = f'{year:04d}-{number:02d}'
            if label < '2002-07':
                platform = 'terra'
            elif label < '2012-02':
                platform = 'aqua'
            else:
                platform = 'snpp'
            raw, cell_days, input_days, status = monthly.get((platform, label), ('', '', 0, 'input_missing'))
            factor = 1.0 if platform == 'snpp' else factors.get(platform)
            value, value_kind = '', 'unavailable'
            calibration_status = 'reference' if platform == 'snpp' else ('validated' if factor is not None else 'not_validated')
            if status == 'full_input_date_range' and factor is not None:
                value = raw if platform == 'snpp' else round(raw * factor, 6)
                value_kind = 'observed' if platform == 'snpp' else 'estimated'
                estimate_status = 'observed' if platform == 'snpp' else ('validated_period' if year >= 2013 else 'extrapolated')
            elif status == 'input_missing':
                estimate_status = 'missing_input'
            elif status == 'partial_input_date_range':
                estimate_status = 'partial_input'
            else:
                estimate_status = 'raw_only'
            harmonized_rows.append([label, platform, raw, cell_days, value, fmt(factor), value_kind,
                                    input_days, calendar.monthrange(year, number)[1], status,
                                    calibration_status, estimate_status])
    write_csv('harmonized_monthly.csv', ['month', 'source_platform', 'raw_hotspots', 'cell_days',
                                         'harmonized_hotspots', 'factor', 'value_kind', 'input_days',
                                         'days_in_month', 'input_status', 'calibration_status',
                                         'estimate_status'], harmonized_rows)
    # Keep the root-level copy in sync; the processed file is canonical.
    (ROOT / 'harmonized_monthly.csv').write_bytes((OUTPUT / 'harmonized_monthly.csv').read_bytes())

    overlap = []
    for ym in sorted(complete['snpp']):
        row = [ym]
        for platform in ('terra', 'aqua', 'snpp', 'noaa20'):
            row.append(complete[platform].get(ym, ''))
        for platform in ('terra', 'aqua', 'noaa20'):
            target = complete['snpp'].get(ym)
            source = complete[platform].get(ym)
            row.append(fmt(target / source, 2) if source and target is not None else '')
        overlap.append(row)
    write_csv('overlap_monthly.csv', ['month', 'terra_raw', 'aqua_raw', 'snpp_raw', 'noaa20_raw',
                                      'terra_ratio', 'aqua_ratio', 'noaa20_ratio'], overlap)

    coverage = []
    for platform in ('terra', 'aqua', 'snpp', 'noaa20'):
        rows = [row for row in month_rows if row[0] == platform]
        full = [row for row in rows if row[6] == 'full_input_date_range']
        zero = [row for row in full if row[2] == 0]
        partial = [row for row in rows if row[6] == 'partial_input_date_range']
        missing = [row for row in rows if row[6] == 'input_missing']
        coverage.append([platform, PLATFORM_PRODUCT[platform], 'Standard Processing',
                         full[0][1] if full else '', full[-1][1] if full else '',
                         len(full), len(zero), len(partial), len(missing),
                         first_detection.get(platform, ''), last_detection.get(platform, ''),
                         len([row for row in inventory if row[1] == ('modis' if platform in ('terra', 'aqua') else 'viirs-snpp' if platform == 'snpp' else 'viirs-jpss1')]),
                         'verified_local_archive' if full else 'no_complete_months'])
    write_csv('coverage_summary.csv', ['platform', 'product', 'processing', 'usable_start', 'usable_end',
                                       'complete_months', 'zero_count_months', 'partial_months',
                                       'missing_months', 'first_detection', 'last_detection',
                                       'archive_files', 'status'], coverage)

    lineage = []
    for (archive, processing, version), count in sorted(lineage_rows.items()):
        first_last = lineage_dates[(archive, processing, version)]
        lineage.append([archive, processing, version, count, first_last[0] or '', first_last[1] or '',
                        '|'.join(sorted(archive_satellites.get(archive, set())))])
    write_csv('source_lineage.csv', ['archive', 'processing', 'version', 'rows_in_delta', 'first_acq_date',
                                     'last_acq_date', 'satellite_codes'], lineage)
    write_csv('version_by_year.csv', ['platform', 'year', 'version', 'eligible_rows'],
              ([platform, year, version, count] for (platform, year, version), count
               in sorted(version_year.items())))
    write_csv('version_monthly.csv', ['platform', 'month', 'version', 'type_0_rows'],
              ([platform, month, version, count] for (platform, month, version), count
               in sorted(version_monthly.items())))

    # MODIS processing version is not constant across the record.  A factor
    # fitted across versions can therefore hide a product change.  These rows
    # are descriptive, not a second calibration claim.
    by_version = []
    for platform in ('terra', 'aqua'):
        versions = sorted({version for (p, _, version) in version_monthly if p == platform})
        for version in versions:
            months = sorted(m for (p, m, v) in version_monthly if p == platform and v == version
                            and m in complete[platform] and m in complete['snpp'])
            if not months:
                continue
            source = sum(complete[platform][m] for m in months)
            target = sum(complete['snpp'][m] for m in months)
            if not source:
                continue
            factor = target / source
            before = [complete[platform][m] - complete['snpp'][m] for m in months]
            after = [factor * complete[platform][m] - complete['snpp'][m] for m in months]
            by_version.append([platform, version, months[0], months[-1], len(months),
                               fmt(factor), fmt(statistics.mean(abs(x) for x in before), 2),
                               fmt(statistics.mean(abs(x) for x in after), 2),
                               fmt(statistics.mean(before), 2), fmt(statistics.mean(after), 2),
                               'descriptive_version_segment'])
    write_csv('calibration_by_version.csv', ['source', 'version', 'first_month', 'last_month',
                                             'overlap_months', 'factor', 'mae_raw', 'mae_adjusted',
                                             'bias_raw', 'bias_adjusted', 'note'], by_version)

    print(f'Profiled {len(inventory)} files, {sum(row[5] for row in inventory):,} rows in the study box, '
          f'{sum(row[6] for row in inventory):,} eligible Standard Processing rows.')
    print(f'Wrote {detection_count:,} bbox detections to detections_delta.csv; calibration factors: '
          f'{ {key: round(value, 2) for key, value in factors.items()} }')
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('download', 'analyze', 'validate', 'all'))
    parser.add_argument('--from-year', type=int, default=2000)
    parser.add_argument('--to-year', type=int, default=2026)
    args = parser.parse_args()
    if not 2000 <= args.from_year <= args.to_year <= 2026:
        parser.error('Choose years in 2000–2026 in ascending order')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    failed = False
    if args.action in ('download', 'all'):
        records = download(args.from_year, args.to_year, os.environ.get('FIRMS_MAP_KEY'))
        (OUTPUT / 'download_log.json').write_text(json.dumps(records, indent=2), encoding='utf-8')
        print(dict(Counter(row['status'] for row in records)))
        failed = any(row['status'] not in ('cached', 'downloaded') for row in records)
    if args.action in ('analyze', 'validate', 'all'):
        failed = not profile() or failed
    return int(failed)


if __name__ == '__main__':
    sys.exit(main())
