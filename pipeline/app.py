"""Delta Fire Calendar - local, dependency-free web application.

Run:
    python app.py
Then open http://127.0.0.1:8000

The app reads only files in data/processed.  It does not download data and it
does not claim that a satellite hotspot is a confirmed fire incident.
"""

import csv
import io
import json
import math
import statistics
import sys
from collections import defaultdict
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / 'data' / 'processed'
WEB = ROOT / 'web'
BOUNDS = (29.5, 29.8, 32.5, 31.65)
GRID_X = [round(29.5 + 0.25 * i, 2) for i in range(12)]
GRID_Y = [round(29.75 + 0.25 * i, 2) for i in range(8)]
PLATFORMS = ('terra', 'aqua', 'snpp', 'noaa20')
PLATFORM_LABEL = {'terra': 'MODIS Terra', 'aqua': 'MODIS Aqua',
                  'snpp': 'VIIRS S-NPP', 'noaa20': 'VIIRS NOAA-20'}
AREAS = [
    {'id': 'full', 'name': 'Full Nile Delta', 'bounds': BOUNDS,
     'description': 'The validated pilot rectangle. Local calibration is tested at this scale.'},
    {'id': 'west', 'name': 'Western Delta', 'bounds': (29.5, 29.8, 31.0, 31.65),
     'description': 'Local factor validated on 2013–2022 and tested on 2023–2025.'},
    {'id': 'east', 'name': 'Eastern Delta', 'bounds': (31.0, 29.8, 32.5, 31.65),
     'description': 'Local factor validated on 2013–2022 and tested on 2023–2025.'},
    {'id': 'south', 'name': 'Southern Delta', 'bounds': (29.5, 29.8, 32.5, 30.7),
     'description': 'Local factor validated on 2013–2022 and tested on 2023–2025.'},
    {'id': 'north', 'name': 'Northern Delta', 'bounds': (29.5, 30.7, 32.5, 31.65),
     'description': 'Local factor validated on 2013–2022 and tested on 2023–2025.'},
]
AREA_BY_ID = {area['id']: area for area in AREAS}
MIN_YEAR, MAX_YEAR = 2000, 2026


def read_processed(name):
    with (PROC / name).open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def load_json(name, default):
    try:
        return json.loads((PROC / name).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return default


def as_float(value):
    if value is None or value == '':
        return None
    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def compact(value):
    if value is None:
        return None
    if abs(value) >= 1000:
        return round(value / 1000, 1)
    return round(value, 1)


# ---------------------------------------------------------------------------
# Data loaded once at startup
# ---------------------------------------------------------------------------

MONTHLY = {}
for row in read_processed('monthly_raw.csv'):
    MONTHLY[(row['platform'], row['month'])] = row

AREA_MONTHLY = {}
for row in read_processed('area_monthly.csv'):
    AREA_MONTHLY[(row['area_id'], row['platform'], row['month'])] = row

GRID = defaultdict(dict)
for row in read_processed('grid_monthly.csv'):
    GRID[(row['platform'], row['month'])][(float(row['west']), float(row['south']))] = row

DISAGREEMENT = defaultdict(list)
for row in read_processed('sensor_disagreement.csv'):
    DISAGREEMENT[row['month']].append(row)

COVERAGE = read_processed('coverage_summary.csv')
CALIBRATION = read_processed('calibration_baseline.csv')
SENSITIVITY = read_processed('calibration_sensitivity.csv')
SPATIAL = read_processed('calibration_spatial.csv')
BY_YEAR = read_processed('calibration_by_year.csv')
BY_MONTH = read_processed('calibration_by_month.csv')
BY_VERSION = read_processed('calibration_by_version.csv')
VERSION_YEAR = read_processed('version_by_year.csv')
LINEAGE = read_processed('source_lineage.csv')
INVENTORY = read_processed('inventory.csv')
DOWNLOAD_LOG = load_json('download_log.json', [])


def era_platform(month_key):
    if month_key < '2002-07':
        return 'terra'
    if month_key < '2012-02':
        return 'aqua'
    return 'snpp'


def in_bounds(x, y, bounds):
    lon, lat = x + 0.125, y + 0.125
    west, south, east, north = bounds
    return west <= lon <= east and south <= lat <= north


def area_cells(area):
    return [(x, y) for x in GRID_X for y in GRID_Y if in_bounds(x, y, area['bounds'])]


def area_from_query(params):
    area_id = (params.get('area_id') or 'full')[0]
    if area_id in AREA_BY_ID:
        area = dict(AREA_BY_ID[area_id])
        area['cells'] = area_cells(area)
        area['validated'] = True
        return area
    try:
        west = max(BOUNDS[0], min(BOUNDS[2] - 0.25, float(params.get('west', ['29.5'])[0])))
        south = max(BOUNDS[1], min(BOUNDS[3] - 0.25, float(params.get('south', ['29.8'])[0])))
        east = max(west + 0.25, min(BOUNDS[2], float(params.get('east', ['32.5'])[0])))
        north = max(south + 0.25, min(BOUNDS[3], float(params.get('north', ['31.65'])[0])))
    except (TypeError, ValueError):
        west, south, east, north = BOUNDS
    area = {'id': 'custom', 'name': 'Custom selection', 'bounds': (west, south, east, north),
            'description': 'A custom rectangle. Local calibration has not been validated at this scale, so only raw counts are shown.',
            'validated': False}
    area['cells'] = area_cells(area)
    return area


def area_bounds_json(area):
    west, south, east, north = area['bounds']
    return {'west': west, 'south': south, 'east': east, 'north': north}


def raw_for_platform(area, platform, month_key):
    if area['validated']:
        row = AREA_MONTHLY.get((area['id'], platform, month_key))
        if not row:
            return None, 'outside_period', None
        raw = as_float(row['raw_hotspots'])
        return raw, row['input_status'], row
    monthly = MONTHLY.get((platform, month_key))
    if not monthly or monthly['input_status'] == 'input_missing':
        return None, monthly['input_status'] if monthly else 'outside_period', None
    value = 0
    cell_days = 0
    cells = area['cells']
    for x, y in cells:
        grid_row = GRID.get((platform, month_key), {}).get((x, y))
        if grid_row:
            value += int(float(grid_row['type_0_rows']))
            cell_days += int(float(grid_row['cell_days']))
    return value, monthly['input_status'], {'raw_hotspots': value, 'cell_days': cell_days,
                                            'input_status': monthly['input_status'],
                                            'input_days': monthly.get('input_days', ''),
                                            'days_in_month': monthly.get('days_in_month', ''),
                                            'factor': '', 'harmonized_hotspots': '',
                                            'value_kind': 'raw', 'calibration_status': 'not_validated_custom',
                                            'estimate_status': 'raw_only' if monthly['input_status'] == 'full_input_date_range' else 'partial_input'}


def cell_record(area, scale, platform, year, month):
    key = f'{year:04d}-{month:02d}'
    raw_by_platform = {}
    status_by_platform = {}
    for p in PLATFORMS:
        raw, status, _ = raw_for_platform(area, p, key)
        raw_by_platform[p] = raw
        status_by_platform[p] = status

    if not area['validated']:
        scale = 'raw'
    selected_platform = platform if scale == 'raw' else era_platform(key) if scale == 'harmonized' else 'snpp'
    if scale == 'snpp_era' and key < '2012-02':
        selected_platform = 'snpp'
    raw, input_status, row = raw_for_platform(area, selected_platform, key)
    cell = {
        'year': year, 'month': month, 'month_key': key, 'platform': selected_platform,
        'raw': raw, 'cell_days': None, 'value': None, 'kind': 'unavailable',
        'estimate_status': 'unavailable', 'calibration_status': 'not_available',
        'factor': None, 'input_status': input_status, 'input_days': None, 'days_in_month': None,
        'raw_by_platform': raw_by_platform, 'input_status_by_platform': status_by_platform,
        'outside_period': input_status == 'outside_period',
    }
    if row:
        cell['cell_days'] = as_float(row.get('cell_days'))
        cell['factor'] = as_float(row.get('factor'))
        cell['input_days'] = as_float(row.get('input_days'))
        cell['days_in_month'] = as_float(row.get('days_in_month'))
        if input_status == 'input_missing':
            cell['kind'] = 'missing'
            cell['estimate_status'] = 'missing_input'
        elif input_status == 'partial_input_date_range':
            cell['value'] = raw
            cell['kind'] = 'partial'
            cell['estimate_status'] = 'partial_input'
        elif scale == 'harmonized':
            value = as_float(row.get('harmonized_hotspots'))
            cell['value'] = value
            cell['kind'] = row.get('value_kind') or ('observed' if selected_platform == 'snpp' else 'estimated')
            cell['estimate_status'] = row.get('estimate_status') or ('observed' if selected_platform == 'snpp' else 'validated_period')
            cell['calibration_status'] = row.get('calibration_status') or 'validated'
        elif scale == 'snpp_era':
            cell['value'] = raw
            cell['kind'] = 'observed' if input_status == 'full_input_date_range' else 'partial'
            cell['estimate_status'] = 'observed'
            cell['calibration_status'] = 'reference'
        else:
            cell['value'] = raw
            cell['kind'] = 'raw' if input_status == 'full_input_date_range' else 'partial'
            cell['estimate_status'] = 'raw_only'
            cell['calibration_status'] = 'not_validated_custom' if not area['validated'] else row.get('calibration_status', 'not_available')
        if area['validated'] and row.get('value_kind') == 'unavailable' and raw is not None:
            cell['estimate_status'] = 'raw_only' if input_status == 'full_input_date_range' else cell['estimate_status']
    elif input_status == 'input_missing':
        cell['kind'] = 'missing'
        cell['estimate_status'] = 'missing_input'
    return cell


def scale_label(area, scale, platform):
    if not area['validated']:
        return 'Raw hotspot detections (custom area; harmonisation not validated)'
    if scale == 'harmonized':
        return 'Harmonised estimate on the VIIRS S-NPP reference scale'
    if scale == 'snpp_era':
        return 'Observed VIIRS S-NPP count (2012–2025 constant scale)'
    return f'Raw {PLATFORM_LABEL.get(platform, platform)} detections (not cross-sensor harmonised)'


def series_for_area(area, scale, platform, start_year, end_year):
    cells = []
    for year in range(start_year, end_year + 1):
        for month in range(1, 13):
            cells.append(cell_record(area, scale, platform, year, month))
    values = [cell['value'] for cell in cells if cell['value'] is not None]
    return {'cells': cells, 'max_value': max(values) if values else 0,
            'min_value': min(values) if values else 0, 'count_values': len(values)}


def compare_for_area(area, scale, platform, year, month):
    selected = cell_record(area, scale, platform, year, month)
    if not area['validated']:
        scale = 'raw'
    baseline_start = 2012 if scale == 'snpp_era' else MIN_YEAR
    baseline = []
    for prior_year in range(baseline_start, year):
        rec = cell_record(area, scale, platform, prior_year, month)
        if rec['value'] is None:
            continue
        if rec['input_status'] != 'full_input_date_range':
            continue
        if rec['kind'] not in ('observed', 'estimated', 'raw'):
            continue
        baseline.append({'year': prior_year, 'value': rec['value'], 'platform': rec['platform'],
                         'kind': rec['kind'], 'estimate_status': rec['estimate_status']})
    values = [item['value'] for item in baseline]
    median = statistics.median(values) if values else None
    difference = selected['value'] - median if selected['value'] is not None and median is not None else None
    percent = (difference / median * 100.0) if median not in (None, 0) and difference is not None else None
    years = [item['year'] for item in baseline]
    # The harmonised median spans two sensor eras: extrapolated MODIS-era years
    # and observed S-NPP years.  Surface that mix instead of hiding it, because
    # the extrapolated share can move the median materially (see West Delta).
    observed_values = [item['value'] for item in baseline if item['estimate_status'] == 'observed']
    extrapolated_values = [item['value'] for item in baseline if item['estimate_status'] == 'extrapolated']
    observed_median = statistics.median(observed_values) if observed_values else None
    composition = {
        'observed': len(observed_values),
        'extrapolated': len(extrapolated_values),
        'observed_median': observed_median,
        'extrapolated_median': statistics.median(extrapolated_values) if extrapolated_values else None,
    }
    return {
        'selected': selected,
        'scale': scale,
        'scale_label': scale_label(area, scale, platform),
        'baseline': baseline,
        'median': median,
        'difference': difference,
        'percent_change': percent,
        'zero_median': median == 0,
        'eligible_years': len(baseline),
        'baseline_period': {'start': min(years), 'end': max(years)} if years else None,
        'baseline_composition': composition,
        'excluded_selected_year': year,
        'selected_observation_in_baseline': False,
        'source': sorted({item['platform'] for item in baseline}) if baseline else [],
        'status': 'ok' if selected['value'] is not None and baseline else
                  ('selected_missing' if selected['value'] is None else 'no_baseline'),
        'warnings': warnings_for(area, selected, baseline, scale, composition, percent),
    }


def warnings_for(area, selected, baseline, scale, composition=None, percent=None):
    warnings = []
    if not area['validated']:
        warnings.append('Custom area: the full-Delta factor has not been validated at this scale, so the comparison uses raw counts only.')
    if selected.get('estimate_status') == 'extrapolated':
        warnings.append('Selected value is estimated outside the 2013–2025 calibration evaluation window (extrapolation).')
    if any(item['estimate_status'] == 'extrapolated' for item in baseline):
        warnings.append('Some baseline years are extrapolated outside the 2013–2025 calibration evaluation window.')
    if composition and composition['observed'] and composition['extrapolated'] and \
            composition['observed_median'] not in (None, 0) and selected.get('value') is not None:
        observed_pct = (selected['value'] - composition['observed_median']) / composition['observed_median'] * 100.0
        if percent is not None and (observed_pct > 0) != (percent > 0):
            warnings.append(
                f'The median mixes {composition["extrapolated"]} extrapolated MODIS-era years with '
                f'{composition["observed"]} observed S-NPP years. Using observed S-NPP years only '
                f'(median {composition["observed_median"]:,.0f}) gives {observed_pct:+.1f}%, '
                f'versus {percent:+.1f}% on the full baseline.')
    if scale == 'raw':
        warnings.append('Raw counts are platform-specific; a step between MODIS and VIIRS is a sensor/product change, not necessarily a fire change.')
    if selected.get('calibration_status') == 'mae_not_improved':
        warnings.append('This platform did not pass the count calibration test; the raw observation is retained.')
    return warnings


def disagreement_for_area(area, year, month):
    key = f'{year:04d}-{month:02d}'
    cells = {}
    for x, y in [(x, y) for x in GRID_X for y in GRID_Y]:
        if in_bounds(x, y, area['bounds']):
            cells[(x, y)] = {'west': x, 'south': y, 'aqua_only': 0, 'snpp_only': 0, 'both': 0}
    for row in DISAGREEMENT.get(key, []):
        x, y = float(row['west']), float(row['south'])
        if (x, y) in cells:
            cells[(x, y)][row['observed_in']] += int(float(row['cell_days']))
    output = []
    for cell in cells.values():
        cell['total'] = cell['aqua_only'] + cell['snpp_only'] + cell['both']
        output.append(cell)
    aqua_only = sum(cell['aqua_only'] for cell in output)
    snpp_only = sum(cell['snpp_only'] for cell in output)
    both = sum(cell['both'] for cell in output)
    active = aqua_only + snpp_only + both
    return {
        'month': key,
        'area': {'id': area['id'], 'name': area['name'], 'bounds': area_bounds_json(area)},
        'pair': 'MODIS Aqua vs VIIRS S-NPP',
        'grid_deg': 0.25,
        'date_rule': 'UTC calendar day from acq_date; same 0.25° cell',
        'denominator': 'active cell-days = aqua_only + snpp_only + both',
        'active_cell_days': active,
        'aqua_only': aqua_only,
        'snpp_only': snpp_only,
        'both': both,
        'disagreement_share': (aqua_only + snpp_only) / active if active else None,
        'both_share': both / active if active else None,
        'cells': output,
        'status': 'ok' if active else 'no_active_cell_days',
        'coverage_note': ('Counts are cell-days with at least one detection in either sensor. '
                          'Cells where neither sensor detected a hotspot are not in the denominator, '
                          'so this is detection disagreement, not a blind-spot estimate.'),
    }


def map_for_area(area, scale, platform, year, month):
    key = f'{year:04d}-{month:02d}'
    if not area['validated']:
        scale = 'raw'
    selected_platform = era_platform(key) if scale == 'harmonized' else (platform if scale == 'raw' else 'snpp')
    if scale == 'snpp_era' and key < '2012-02':
        selected_platform = 'snpp'
    factor = 1.0
    row = AREA_MONTHLY.get((area['id'], selected_platform, key)) if area['validated'] else None
    if row:
        factor = as_float(row.get('factor')) or 1.0
    if scale != 'harmonized':
        factor = 1.0
    cells = []
    for x in GRID_X:
        for y in GRID_Y:
            grid_row = GRID.get((selected_platform, key), {}).get((x, y))
            raw = int(float(grid_row['type_0_rows'])) if grid_row else 0
            cell_days = int(float(grid_row['cell_days'])) if grid_row else 0
            value = raw * factor if scale == 'harmonized' else raw
            cells.append({'west': x, 'south': y, 'raw': raw, 'cell_days': cell_days,
                          'value': round(value, 2), 'in_area': in_bounds(x, y, area['bounds'])})
    values = [cell['value'] for cell in cells if cell['in_area']]
    return {
        'month': key, 'scale': scale, 'platform': selected_platform,
        'platform_label': PLATFORM_LABEL.get(selected_platform, selected_platform),
        'factor': factor, 'cells': cells,
        'max_value': max(values) if values else 0,
        'area': {'id': area['id'], 'name': area['name'], 'bounds': area_bounds_json(area)},
        'scale_label': scale_label(area, scale, platform),
        'note': 'Map cells show the selected platform and month; absent cells are zero detections, not missing inputs.' if scale != 'harmonized' else
                'Map values are the harmonised estimate for the selected platform; absent cells are zero detections.',
    }


def csv_response(text, filename):
    data = text.encode('utf-8-sig')
    return data, 'text/csv; charset=utf-8', filename


def monthly_csv(area, scale, platform, start_year, end_year):
    rows = []
    generated = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    for year in range(start_year, end_year + 1):
        for month in range(1, 13):
            rec = cell_record(area, scale, platform, year, month)
            rows.append({
                'area_id': area['id'], 'area_name': area['name'],
                'west': area['bounds'][0], 'south': area['bounds'][1],
                'east': area['bounds'][2], 'north': area['bounds'][3],
                'year': year, 'month': month, 'scale': scale,
                'platform': rec['platform'], 'value': rec['value'], 'kind': rec['kind'],
                'estimate_status': rec['estimate_status'], 'calibration_status': rec['calibration_status'],
                'input_status': rec['input_status'], 'input_days': rec['input_days'],
                'days_in_month': rec['days_in_month'],
                'raw_terra': rec['raw_by_platform'].get('terra'),
                'raw_aqua': rec['raw_by_platform'].get('aqua'),
                'raw_snpp': rec['raw_by_platform'].get('snpp'),
                'raw_noaa20': rec['raw_by_platform'].get('noaa20'),
                'cell_days': rec['cell_days'], 'factor': rec['factor'],
                'source': 'NASA FIRMS annual country archive (Egypt); Standard Processing; MODIS Collection 6.x / VIIRS Collection 2',
                'provenance': 'data/raw/firms/annual_egypt; processed by firms_pipeline.py',
                'generated_utc': generated,
            })
    columns = list(rows[0].keys()) if rows else []
    stream = io.StringIO()
    writer = csv.DictWriter(stream, fieldnames=columns)
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue()


def detections_csv(area, start_month, end_month):
    west, south, east, north = area['bounds']
    stream = io.StringIO()
    source = PROC / 'detections_delta.csv'
    with source.open(encoding='utf-8-sig', newline='') as fh:
        reader = csv.DictReader(fh)
        extra = ['area_id', 'selection_west', 'selection_south', 'selection_east', 'selection_north']
        writer = csv.DictWriter(stream, fieldnames=extra + list(reader.fieldnames or []))
        writer.writeheader()
        for row in reader:
            try:
                lat, lon = float(row['latitude']), float(row['longitude'])
            except (TypeError, ValueError):
                continue
            if not (west <= lon <= east and south <= lat <= north):
                continue
            month = row['acq_date'][:7]
            if not (start_month <= month <= end_month):
                continue
            row.update({'area_id': area['id'], 'selection_west': west, 'selection_south': south,
                        'selection_east': east, 'selection_north': north})
            writer.writerow(row)
    return stream.getvalue()


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    server_version = 'DeltaFireCalendar/1.0'

    def log_message(self, fmt, *args):
        sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % args))

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False, default=str).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def send_bytes(self, body, content_type, filename=None):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        if filename:
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)
        try:
            if path == '/health':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
                return
            if path == '/api/meta':
                return self.send_json(meta())
            if path == '/api/calendar':
                area = area_from_query(params)
                scale = params.get('scale', ['harmonized'])[0]
                platform = params.get('platform', ['snpp'])[0]
                start_year = int(params.get('start_year', [str(MIN_YEAR)])[0])
                end_year = int(params.get('end_year', [str(MAX_YEAR)])[0])
                start_year = max(MIN_YEAR, min(MAX_YEAR, start_year))
                end_year = max(start_year, min(MAX_YEAR, end_year))
                data = series_for_area(area, scale, platform, start_year, end_year)
                return self.send_json({'area': area_public(area), 'scale': scale, 'platform': platform,
                                       'scale_label': scale_label(area, scale, platform),
                                       'start_year': start_year, 'end_year': end_year, **data})
            if path == '/api/compare':
                area = area_from_query(params)
                scale = params.get('scale', ['harmonized'])[0]
                platform = params.get('platform', ['snpp'])[0]
                year = int(params.get('year', ['2023'])[0])
                month = int(params.get('month', ['9'])[0])
                return self.send_json({'area': area_public(area), **compare_for_area(area, scale, platform, year, month)})
            if path == '/api/disagreement':
                area = area_from_query(params)
                year = int(params.get('year', ['2023'])[0])
                month = int(params.get('month', ['9'])[0])
                return self.send_json(disagreement_for_area(area, year, month))
            if path == '/api/map':
                area = area_from_query(params)
                scale = params.get('scale', ['harmonized'])[0]
                platform = params.get('platform', ['snpp'])[0]
                year = int(params.get('year', ['2023'])[0])
                month = int(params.get('month', ['9'])[0])
                return self.send_json({'area': area_public(area), **map_for_area(area, scale, platform, year, month)})
            if path == '/api/download':
                kind = params.get('kind', ['monthly'])[0]
                area = area_from_query(params)
                if kind == 'detections':
                    start_year = int(params.get('start_year', [str(MAX_YEAR - 1)])[0])
                    end_year = int(params.get('end_year', [str(start_year)])[0])
                    start_month = f'{start_year:04d}-01'
                    end_month = f'{end_year:04d}-12'
                    text = detections_csv(area, start_month, end_month)
                    filename = f'delta_hotspots_{area["id"]}_{start_year}_{end_year}.csv'
                else:
                    scale = params.get('scale', ['harmonized'])[0]
                    platform = params.get('platform', ['snpp'])[0]
                    start_year = int(params.get('start_year', [str(MIN_YEAR)])[0])
                    end_year = int(params.get('end_year', [str(MAX_YEAR)])[0])
                    text = monthly_csv(area, scale, platform, start_year, end_year)
                    filename = f'delta_calendar_{area["id"]}_{scale}_{start_year}_{end_year}.csv'
                data, content_type, filename = csv_response(text, filename)
                return self.send_bytes(data, content_type, filename)
            return self.serve_static(path)
        except (ValueError, TypeError, KeyError) as exc:
            return self.send_json({'error': str(exc)}, status=400)
        except BrokenPipeError:
            return
        except Exception as exc:  # keep the demo alive and visible
            self.log_message('error: %s', exc)
            return self.send_json({'error': 'internal_error', 'detail': str(exc)}, status=500)

    def serve_static(self, path):
        if path in ('', '/'):
            path = '/index.html'
        candidate = (WEB / path.lstrip('/')).resolve()
        if not str(candidate).startswith(str(WEB.resolve())) or not candidate.is_file():
            self.send_error(404)
            return
        content_type = {
            '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml',
            '.json': 'application/json; charset=utf-8',
        }.get(candidate.suffix.lower(), 'application/octet-stream')
        self.send_bytes(candidate.read_bytes(), content_type)


def area_public(area):
    return {'id': area['id'], 'name': area['name'], 'bounds': area_bounds_json(area),
            'validated': area['validated'], 'description': area['description'],
            'cells': len(area['cells'])}


def meta():
    total_rows = sum(int(float(row['delta_rows'])) for row in INVENTORY)
    eligible_rows = sum(int(float(row['eligible_delta_rows'])) for row in INVENTORY)
    return {
        'app': 'Delta Fire Calendar',
        'version': '1.0',
        'bounds': {'west': BOUNDS[0], 'south': BOUNDS[1], 'east': BOUNDS[2], 'north': BOUNDS[3]},
        'grid': {'deg': 0.25, 'x': GRID_X, 'y': GRID_Y, 'rows': len(GRID_Y), 'columns': len(GRID_X)},
        'years': {'min': MIN_YEAR, 'max': MAX_YEAR, 'verified_end': '2025-12', 'pending': '2026'},
        'platforms': [{'id': p, 'label': PLATFORM_LABEL[p], 'product': 'MODIS' if p in ('terra', 'aqua') else 'VIIRS'}
                      for p in PLATFORMS],
        'areas': AREAS,
        'coverage': COVERAGE,
        'calibration': CALIBRATION,
        'sensitivity': SENSITIVITY,
        'spatial': SPATIAL,
        'by_year': BY_YEAR,
        'by_month': BY_MONTH,
        'by_version': BY_VERSION,
        'version_year': VERSION_YEAR,
        'lineage': LINEAGE,
        'download_log': DOWNLOAD_LOG,
        'totals': {'files': len(INVENTORY), 'delta_rows': total_rows, 'eligible_rows': eligible_rows},
        'provenance': {
            'source': 'NASA FIRMS annual country archive for Egypt (Standard Processing)',
            'archive': 'data/raw/firms/annual_egypt (48 CSVs, 2000–2025)',
            'processed': 'data/processed (rebuilt by firms_pipeline.py analyze)',
            'canonical_monthly': 'data/processed/area_monthly.csv',
            'note': 'The root harmonized_monthly.csv is a convenience copy; data/processed is canonical.',
        },
        'demo': {'area_id': 'full', 'year': 2023, 'month': 9, 'scale': 'harmonized',
                 'note': 'September 2023 is complete and has a positive anomaly on the full-record harmonised scale; the S-NPP-only scale is also available.'},
        'limitations': [
            'A FIRMS hotspot is a satellite detection, not a confirmed fire incident.',
            'The 0.25° monthly calendar aggregates detections; it does not measure burned area or fire duration.',
            'The full-Delta multiplicative factors are validated on 2013–2022 and tested on 2023–2025; earlier values are extrapolation.',
            'MODIS product versions change (6.2 → 6.03 → 61.03); a step in the series can be a processing change, not a fire change.',
            'NOAA-20 count calibration did not improve held-out MAE, so its raw values are retained with an explicit status.',
            'Aqua vs S-NPP disagreement is detection disagreement, not proof of a sensor blind spot.',
            '2026 is not verified locally; the 2026 archive is absent and no 2026 value is shown.',
            'No forecasting is included; the app is a historical calendar and validation tool.',
        ],
    }


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'Delta Fire Calendar running at http://127.0.0.1:{port}')
    print('Press Ctrl+C to stop.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
