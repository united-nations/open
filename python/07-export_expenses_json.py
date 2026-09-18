"""Export expenses data to JSON for frontend consumption."""
import json
import pandas as pd
from pathlib import Path
import country_converter as coco
from utils import normalize_entity

OUT = Path("public/data")

# Country centroids by ISO3
COUNTRY_CENTROIDS = {
    "AFG": (33.9391, 67.7100), "ALB": (41.1533, 20.1683), "DZA": (28.0339, 1.6596),
    "AGO": (-11.2027, 17.8739), "ARG": (-38.4161, -63.6167), "ARM": (40.0691, 45.0382),
    "AUS": (-25.2744, 133.7751), "AUT": (47.5162, 14.5501), "AZE": (40.1431, 47.5769),
    "BGD": (23.6850, 90.3563), "BLR": (53.7098, 27.9534), "BEL": (50.8503, 4.3517),
    "BEN": (9.3077, 2.3158), "BTN": (27.5142, 90.4336), "BOL": (-16.2902, -63.5887),
    "BIH": (43.9159, 17.6791), "BWA": (-22.3285, 24.6849), "BRA": (-14.2350, -51.9253),
    "BGR": (42.7339, 25.4858), "BFA": (12.2383, -1.5616), "BDI": (-3.3731, 29.9189),
    "KHM": (12.5657, 104.9910), "CMR": (7.3697, 12.3547), "CAN": (56.1304, -106.3468),
    "CAF": (6.6111, 20.9394), "TCD": (15.4542, 18.7322), "CHL": (-35.6751, -71.5430),
    "CHN": (35.8617, 104.1954), "COL": (4.5709, -74.2973), "COM": (-11.6455, 43.3333),
    "COG": (-0.2280, 15.8277), "COD": (-4.0383, 21.7587), "CRI": (9.7489, -83.7534),
    "CIV": (7.5400, -5.5471), "HRV": (45.1000, 15.2000), "CUB": (21.5218, -77.7812),
    "CYP": (35.1264, 33.4299), "CZE": (49.8175, 15.4730), "DNK": (56.2639, 9.5018),
    "DJI": (11.8251, 42.5903), "DOM": (18.7357, -70.1627), "ECU": (-1.8312, -78.1834),
    "EGY": (26.8206, 30.8025), "SLV": (13.7942, -88.8965), "GNQ": (1.6508, 10.2679),
    "ERI": (15.1794, 39.7823), "EST": (58.5953, 25.0136), "SWZ": (-26.5225, 31.4659),
    "ETH": (9.1450, 40.4897), "FJI": (-17.7134, 178.0650), "FIN": (61.9241, 25.7482),
    "FRA": (46.2276, 2.2137), "GAB": (-0.8037, 11.6094), "GMB": (13.4432, -15.3101),
    "GEO": (42.3154, 43.3569), "DEU": (51.1657, 10.4515), "GHA": (7.9465, -1.0232),
    "GRC": (39.0742, 21.8243), "GTM": (15.7835, -90.2308), "GIN": (9.9456, -9.6966),
    "GNB": (11.8037, -15.1804), "GUY": (4.8604, -58.9302), "HTI": (18.9712, -72.2852),
    "HND": (15.2000, -86.2419), "HUN": (47.1625, 19.5033), "ISL": (64.9631, -19.0208),
    "IND": (20.5937, 78.9629), "IDN": (-0.7893, 113.9213), "IRN": (32.4279, 53.6880),
    "IRQ": (33.2232, 43.6793), "IRL": (53.4129, -8.2439), "ISR": (31.0461, 34.8516),
    "ITA": (41.8719, 12.5674), "JAM": (18.1096, -77.2975), "JPN": (36.2048, 138.2529),
    "JOR": (30.5852, 36.2384), "KAZ": (48.0196, 66.9237), "KEN": (-0.0236, 37.9062),
    "KOR": (35.9078, 127.7669), "KWT": (29.3117, 47.4818), "KGZ": (41.2044, 74.7661),
    "LAO": (19.8563, 102.4955), "LVA": (56.8796, 24.6032), "LBN": (33.8547, 35.8623),
    "LSO": (-29.6100, 28.2336), "LBR": (6.4281, -9.4295), "LBY": (26.3351, 17.2283),
    "LTU": (55.1694, 23.8813), "LUX": (49.8153, 6.1296), "MDG": (-18.7669, 46.8691),
    "MWI": (-13.2543, 34.3015), "MYS": (4.2105, 101.9758), "MDV": (3.2028, 73.2207),
    "MLI": (17.5707, -3.9962), "MLT": (35.9375, 14.3754), "MRT": (21.0079, -10.9408),
    "MUS": (-20.3484, 57.5522), "MEX": (23.6345, -102.5528), "MDA": (47.4116, 28.3699),
    "MNG": (46.8625, 103.8467), "MNE": (42.7087, 19.3744), "MAR": (31.7917, -7.0926),
    "MOZ": (-18.6657, 35.5296), "MMR": (21.9162, 95.9560), "NAM": (-22.9576, 18.4904),
    "NPL": (28.3949, 84.1240), "NLD": (52.1326, 5.2913), "NZL": (-40.9006, 174.8860),
    "NIC": (12.8654, -85.2072), "NER": (17.6078, 8.0817), "NGA": (9.0820, 8.6753),
    "MKD": (41.5124, 21.7465), "NOR": (60.4720, 8.4689), "OMN": (21.4735, 55.9754),
    "PAK": (30.3753, 69.3451), "PSE": (31.9522, 35.2332), "PAN": (8.5380, -80.7821),
    "PNG": (-6.3150, 143.9555), "PRY": (-23.4425, -58.4438), "PER": (-9.1900, -75.0152),
    "PHL": (12.8797, 121.7740), "POL": (51.9194, 19.1451), "PRT": (39.3999, -8.2245),
    "QAT": (25.3548, 51.1839), "ROU": (45.9432, 24.9668), "RUS": (61.5240, 105.3188),
    "RWA": (-1.9403, 29.8739), "SAU": (23.8859, 45.0792), "SEN": (14.4974, -14.4524),
    "SRB": (44.0165, 21.0059), "SLE": (8.4606, -11.7799), "SGP": (1.3521, 103.8198),
    "SVK": (48.6690, 19.6990), "SVN": (46.1512, 14.9955), "SOM": (5.1521, 46.1996),
    "ZAF": (-30.5595, 22.9375), "SSD": (6.8770, 31.3070), "ESP": (40.4637, -3.7492),
    "LKA": (7.8731, 80.7718), "SDN": (12.8628, 30.2176), "SUR": (3.9193, -56.0278),
    "SWE": (60.1282, 18.6435), "CHE": (46.8182, 8.2275), "SYR": (34.8021, 38.9968),
    "TJK": (38.8610, 71.2761), "TZA": (-6.3690, 34.8888), "THA": (15.8700, 100.9925),
    "TLS": (-8.8742, 125.7275), "TGO": (8.6195, 0.8248), "TTO": (10.6918, -61.2225),
    "TUN": (33.8869, 9.5375), "TUR": (38.9637, 35.2433), "TKM": (38.9697, 59.5563),
    "UGA": (1.3733, 32.2903), "UKR": (48.3794, 31.1656), "ARE": (23.4241, 53.8478),
    "GBR": (55.3781, -3.4360), "USA": (37.0902, -95.7129), "URY": (-32.5228, -55.7658),
    "UZB": (41.3775, 64.5853), "VEN": (6.4238, -66.5897), "VNM": (14.0583, 108.2772),
    "YEM": (15.5527, 48.5164), "ZMB": (-13.1339, 27.8493), "ZWE": (-19.0154, 29.1549),
    "XKX": (42.6026, 20.9030), "TWN": (23.6978, 120.9605),
    # Additional countries and territories
    "PRK": (40.3399, 127.5101), "BRB": (13.1939, -59.5432), "ATG": (17.0608, -61.7964),
    "BHS": (25.0343, -77.3963), "BHR": (26.0667, 50.5577), "BLZ": (17.1899, -88.4976),
    "BRN": (4.5353, 114.7277), "CPV": (16.5388, -23.0418), "DMA": (15.4150, -61.3710),
    "GRD": (12.1165, -61.6790), "KIR": (-3.3704, -168.7340), "LIE": (47.1660, 9.5554),
    "MHL": (7.1315, 171.1845), "FSM": (7.4256, 150.5508), "MCO": (43.7384, 7.4246),
    "NRU": (-0.5228, 166.9315), "PLW": (7.5150, 134.5825), "KNA": (17.3578, -62.7830),
    "LCA": (13.9094, -60.9789), "VCT": (12.9843, -61.2872), "WSM": (-13.7590, -172.1046),
    "SMR": (43.9424, 12.4578), "STP": (0.1864, 6.6131), "SYC": (-4.6796, 55.4920),
    "SLB": (-9.6457, 160.1562), "TON": (-21.1790, -175.1982), "TUV": (-7.1095, 179.1940),
    "VUT": (-15.3767, 166.9592), "AND": (42.5063, 1.5218),
    # Territories
    "ABW": (12.5211, -69.9683), "AIA": (18.2206, -63.0686), "ASM": (-14.2710, -170.1322),
    "BES": (12.2019, -68.2624), "BMU": (32.3078, -64.7505), "COK": (-21.2367, -159.7777),
    "CUW": (12.1696, -68.9900), "CYM": (19.3133, -81.2546), "ESH": (24.2155, -12.8858),
    "GIB": (36.1408, -5.3536), "GLP": (16.2650, -61.5510), "GUM": (13.4443, 144.7937),
    "HKG": (22.3193, 114.1694), "MAC": (22.1987, 113.5439), "MAF": (18.0731, -63.0822),
    "MNP": (15.0979, 145.6739), "MSR": (16.7425, -62.1874), "MTQ": (14.6415, -61.0242),
    "NCL": (-20.9043, 165.6180), "NFK": (-29.0408, 167.9547), "NIU": (-19.0544, -169.8672),
    "PRI": (18.2208, -66.5901), "PYF": (-17.6797, -149.4068), "REU": (-21.1151, 55.5364),
    "SHN": (-15.9650, -5.7089), "SPM": (46.8852, -56.3159), "SXM": (18.0425, -63.0548),
    "TCA": (21.6940, -71.7979), "TKL": (-9.2002, -171.8484), "VAT": (41.9029, 12.4534),
    "VGB": (18.4207, -64.6400),
}

cc = coco.CountryConverter()

def load_fused_expenses() -> pd.DataFrame:
    df = pd.read_csv("data/ceb/fused/expenses.csv")
    df["entity"] = df["entity"].apply(normalize_entity)
    return df

def load_sdg_expenses() -> pd.DataFrame:
    df = pd.read_csv("data/ceb/clean/expenses_sdgs.csv")
    df = df.rename(columns={"calendar_year": "year", "entity_code": "entity", "sdg_goal": "sdg"})
    df["entity"] = df["entity"].apply(normalize_entity)
    return df

def get_iso3(country: str) -> str | None:
    result = cc.convert(country, to="ISO3", not_found=None)
    if isinstance(result, list): return result[0] if result else None
    return result if result else None

def load_country_expenses() -> pd.DataFrame:
    df = pd.read_csv("data/ceb/clean/expenses_by_country_region_sub_agency.csv")
    df = df.rename(columns={"calendar_year": "year", "agency": "entity", "country/territory": "country"})
    df["entity"] = df["entity"].apply(normalize_entity)
    df = df[df["location_type"] == "COU"]
    df["iso3"] = df["country"].apply(get_iso3)
    return df[df["iso3"].notna()]

def export_entity_spending(expenses: pd.DataFrame):
    years = sorted(expenses["year"].unique())
    for year in years:
        df = expenses[expenses["year"] == year]
        data = df[["entity", "source", "year", "amount"]].to_dict(orient="records")
        with open(OUT / f"entity-spending-{year}.json", "w") as f:
            json.dump(data, f, indent=2)
        print(f"entity-spending-{year}.json: {len(data)} entities")

def export_sdg_expenses(sdg: pd.DataFrame):
    years = sorted(sdg["year"].unique())
    for year in years:
        df = sdg[sdg["year"] == year]
        data = {}
        for sdg_num in [*range(1, 18), "unallocated"]:
            key = "x00" if sdg_num == "unallocated" else str(sdg_num)
            sdg_df = df[df["sdg"].astype(str).str.lower() == key]
            entities = sdg_df.groupby("entity")["amount"].sum().to_dict()
            data[str(sdg_num)] = {"total": sum(entities.values()), "entities": entities}
        with open(OUT / f"sdg-expenses-{year}.json", "w") as f:
            json.dump(data, f, indent=2)
        total = sum(d["total"] for d in data.values())
        print(f"sdg-expenses-{year}.json: ${total/1e9:.1f}B")

def export_country_expenses(country: pd.DataFrame):
    years = sorted(country["year"].unique())
    for year in years:
        df = country[country["year"] == year]
        data = []
        for iso3, group in df.groupby("iso3"):
            coords = COUNTRY_CENTROIDS.get(iso3)
            if not coords: continue
            entities = group.groupby("entity")["amount"].sum().to_dict()
            entities = dict(sorted(entities.items(), key=lambda x: -x[1]))
            name = cc.convert(iso3, to="name_short", not_found=iso3)
            region = group["region"].mode().iloc[0] if len(group["region"].mode()) else "Unknown"
            data.append({
                "iso3": iso3, "name": name, "region": region,
                "lat": coords[0], "long": coords[1],
                "total": round(group["amount"].sum(), 2),
                "entities": {k: round(v, 2) for k, v in entities.items()}
            })
        data = sorted(data, key=lambda x: -x["total"])
        with open(OUT / f"country-expenses-{year}.json", "w") as f:
            json.dump(data, f, indent=2)
        print(f"country-expenses-{year}.json: {len(data)} countries")

if __name__ == "__main__":
    print("Loading data...")
    expenses = load_fused_expenses()
    sdg = load_sdg_expenses()
    country = load_country_expenses()
    
    print(f"\nExporting entity spending ({expenses['year'].nunique()} years)...")
    export_entity_spending(expenses)
    
    print(f"\nExporting SDG expenses ({sdg['year'].nunique()} years)...")
    export_sdg_expenses(sdg)
    
    print(f"\nExporting country expenses ({country['year'].nunique()} years)...")
    export_country_expenses(country)
    
    print("\nDone.")
