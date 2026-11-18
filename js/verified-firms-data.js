/* verified-firms-data.js: Auto-generated from data/processed/*.csv (Real NASA FIRMS Egypt Archive 2000–2025). */

const VERIFIED_FIRMS = {
    "source":  "NASA FIRMS Verified Egypt Archive (2000–2025)",
    "totalArchiveFiles":  74,
    "coverage":  [
                     {
                         "platform":  "terra",
                         "product":  "MODIS",
                         "start":  "2000-11",
                         "end":  "2025-12",
                         "completeMonths":  302,
                         "archiveFiles":  26
                     },
                     {
                         "platform":  "aqua",
                         "product":  "MODIS",
                         "start":  "2002-07",
                         "end":  "2025-12",
                         "completeMonths":  282,
                         "archiveFiles":  26
                     },
                     {
                         "platform":  "snpp",
                         "product":  "VIIRS S-NPP",
                         "start":  "2012-02",
                         "end":  "2025-12",
                         "completeMonths":  167,
                         "archiveFiles":  14
                     },
                     {
                         "platform":  "noaa20",
                         "product":  "VIIRS NOAA-20",
                         "start":  "2018-04",
                         "end":  "2025-12",
                         "completeMonths":  93,
                         "archiveFiles":  8
                     }
                 ],
    "calibrationBaseline":  [
                                {
                                    "source":  "terra",
                                    "trainMonths":  120,
                                    "testMonths":  36,
                                    "factor":  18.39,
                                    "maeRaw":  309.75,
                                    "maeAdjusted":  141.17,
                                    "biasRaw":  -309.75,
                                    "biasAdjusted":  -17.51,
                                    "status":  "mae_improved"
                                },
                                {
                                    "source":  "aqua",
                                    "trainMonths":  120,
                                    "testMonths":  36,
                                    "factor":  19.23,
                                    "maeRaw":  308.67,
                                    "maeAdjusted":  140.32,
                                    "biasRaw":  -308.67,
                                    "biasAdjusted":  17.38,
                                    "status":  "mae_improved"
                                },
                                {
                                    "source":  "noaa20",
                                    "trainMonths":  48,
                                    "testMonths":  36,
                                    "factor":  1.01,
                                    "maeRaw":  28.86,
                                    "maeAdjusted":  30.43,
                                    "biasRaw":  14.03,
                                    "biasAdjusted":  18.99,
                                    "status":  "mae_not_improved"
                                }
                            ],
    "calibrationSpatial":  [
                               {
                                   "areaId":  "full",
                                   "areaName":  "Full Nile Delta",
                                   "source":  "terra",
                                   "factor":  18.39,
                                   "maeRaw":  309.8,
                                   "maeAdjusted":  141.2,
                                   "status":  "mae_improved"
                               },
                               {
                                   "areaId":  "full",
                                   "areaName":  "Full Nile Delta",
                                   "source":  "aqua",
                                   "factor":  19.23,
                                   "maeRaw":  308.7,
                                   "maeAdjusted":  140.3,
                                   "status":  "mae_improved"
                               },
                               {
                                   "areaId":  "west",
                                   "areaName":  "Western Delta",
                                   "source":  "terra",
                                   "factor":  14.96,
                                   "maeRaw":  103.3,
                                   "maeAdjusted":  52.3,
                                   "status":  "mae_improved"
                               },
                               {
                                   "areaId":  "west",
                                   "areaName":  "Western Delta",
                                   "source":  "aqua",
                                   "factor":  20.55,
                                   "maeRaw":  106.7,
                                   "maeAdjusted":  57.5,
                                   "status":  "mae_improved"
                               },
                               {
                                   "areaId":  "east",
                                   "areaName":  "Eastern Delta",
                                   "source":  "terra",
                                   "factor":  20.67,
                                   "maeRaw":  206.4,
                                   "maeAdjusted":  107.7,
                                   "status":  "mae_improved"
                               },
                               {
                                   "areaId":  "east",
                                   "areaName":  "Eastern Delta",
                                   "source":  "aqua",
                                   "factor":  18.65,
                                   "maeRaw":  201.9,
                                   "maeAdjusted":  99.7,
                                   "status":  "mae_improved"
                               },
                               {
                                   "areaId":  "south",
                                   "areaName":  "Southern Delta",
                                   "source":  "terra",
                                   "factor":  16.93,
                                   "maeRaw":  138.7,
                                   "maeAdjusted":  66.3,
                                   "status":  "mae_improved"
                               },
                               {
                                   "areaId":  "south",
                                   "areaName":  "Southern Delta",
                                   "source":  "aqua",
                                   "factor":  32.66,
                                   "maeRaw":  142.5,
                                   "maeAdjusted":  117.7,
                                   "status":  "mae_improved"
                               },
                               {
                                   "areaId":  "north",
                                   "areaName":  "Northern Delta",
                                   "source":  "terra",
                                   "factor":  19.41,
                                   "maeRaw":  171.1,
                                   "maeAdjusted":  101.2,
                                   "status":  "mae_improved"
                               },
                               {
                                   "areaId":  "north",
                                   "areaName":  "Northern Delta",
                                   "source":  "aqua",
                                   "factor":  15.38,
                                   "maeRaw":  166.2,
                                   "maeAdjusted":  66.5,
                                   "status":  "mae_improved"
                               }
                           ],
    "harmonizedYearly":  [
                             {
                                 "year":  2000,
                                 "months":  2,
                                 "raw":  27,
                                 "harmonized":  497,
                                 "source":  "terra",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2001,
                                 "months":  12,
                                 "raw":  151,
                                 "harmonized":  2777,
                                 "source":  "terra",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2002,
                                 "months":  12,
                                 "raw":  167,
                                 "harmonized":  3153,
                                 "source":  "terra+aqua",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2003,
                                 "months":  12,
                                 "raw":  170,
                                 "harmonized":  3269,
                                 "source":  "aqua",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2004,
                                 "months":  12,
                                 "raw":  240,
                                 "harmonized":  4614,
                                 "source":  "aqua",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2005,
                                 "months":  12,
                                 "raw":  315,
                                 "harmonized":  6056,
                                 "source":  "aqua",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2006,
                                 "months":  12,
                                 "raw":  357,
                                 "harmonized":  6864,
                                 "source":  "aqua",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2007,
                                 "months":  12,
                                 "raw":  414,
                                 "harmonized":  7960,
                                 "source":  "aqua",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2008,
                                 "months":  12,
                                 "raw":  380,
                                 "harmonized":  7306,
                                 "source":  "aqua",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2009,
                                 "months":  12,
                                 "raw":  419,
                                 "harmonized":  8056,
                                 "source":  "aqua",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2010,
                                 "months":  12,
                                 "raw":  376,
                                 "harmonized":  7229,
                                 "source":  "aqua",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2011,
                                 "months":  12,
                                 "raw":  309,
                                 "harmonized":  5941,
                                 "source":  "aqua",
                                 "kind":  "estimated"
                             },
                             {
                                 "year":  2012,
                                 "months":  12,
                                 "raw":  4825,
                                 "harmonized":  4898,
                                 "source":  "aqua+snpp",
                                 "kind":  "estimated/observed"
                             },
                             {
                                 "year":  2013,
                                 "months":  12,
                                 "raw":  6895,
                                 "harmonized":  6895,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2014,
                                 "months":  12,
                                 "raw":  6412,
                                 "harmonized":  6412,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2015,
                                 "months":  12,
                                 "raw":  5809,
                                 "harmonized":  5809,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2016,
                                 "months":  12,
                                 "raw":  6958,
                                 "harmonized":  6958,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2017,
                                 "months":  12,
                                 "raw":  5841,
                                 "harmonized":  5841,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2018,
                                 "months":  12,
                                 "raw":  3304,
                                 "harmonized":  3304,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2019,
                                 "months":  12,
                                 "raw":  3524,
                                 "harmonized":  3524,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2020,
                                 "months":  12,
                                 "raw":  3480,
                                 "harmonized":  3480,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2021,
                                 "months":  12,
                                 "raw":  4099,
                                 "harmonized":  4099,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2022,
                                 "months":  12,
                                 "raw":  3936,
                                 "harmonized":  3936,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2023,
                                 "months":  12,
                                 "raw":  5559,
                                 "harmonized":  5559,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2024,
                                 "months":  12,
                                 "raw":  3604,
                                 "harmonized":  3604,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             },
                             {
                                 "year":  2025,
                                 "months":  12,
                                 "raw":  2593,
                                 "harmonized":  2593,
                                 "source":  "snpp",
                                 "kind":  "observed"
                             }
                         ]
};
