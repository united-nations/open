# https://airtable.com/create/tokens

import os
from pathlib import Path

import pandas as pd
from pyairtable import Api
from dotenv import load_dotenv
from utils import normalize_entity, include_ceb_aggregate_entities

# Load environment variables from .env file
load_dotenv()

api = Api(os.environ["AIRTABLE_API_KEY"])

BASE_ID = os.environ["AIRTABLE_BASE_ID"]
TABLE_ID = os.environ["AIRTABLE_TABLE_ID"]

table = api.table(BASE_ID, TABLE_ID)
records = table.all(view="All")

if records:
    record_ids = [record["id"] for record in records]
    duplicate_record_ids = sorted(
        record_id
        for record_id in set(record_ids)
        if record_ids.count(record_id) > 1
    )
    if duplicate_record_ids:
        raise ValueError(f"Duplicate Airtable record IDs: {duplicate_record_ids}")

    data = [record["fields"] for record in records]
    df = pd.DataFrame(data)
else:
    raise ValueError("Airtable returned no records")

# df.shape[1]
# df.shape[0]
# df.columns
# List of selected columns
output_columns = [
    "entity",
    "entity_long",
    "entity_combined",
    "entity_description",
    "entity_link",
    "entity_link_is_un_org",
    "system_grouping",
    "category",
    "un_principal_organ",
    "is_ceb_member",
    "head_of_entity_title_general",
    "head_of_entity_title_specific",
    "head_of_entity_name",
    "head_of_entity_level",
    # "head_of_entity_bio",
    "head_of_entity_headshot",
    "global_leadership_team_url",
    "on_display",
    "foundational_mandate",
    "organizational_chart_link",
    "budget_financial_reporting_link",
    "results_framework_link",
    "strategic_plan_link",
    "annual_reports_link",
    "transparency_portal_link",
    "socials_linkedin",
    "socials_twitter",
    "socials_instagram",
    "entity_news_page",
    "entity_branding_page",
    "entity_data_page",
    "entity_logo_page",
    "entity_wikipedia_page"
]

source_columns = [
    column
    for column in output_columns
    if column != "system_grouping"
]

# TODO: don't forget to also add in `entity.ts`

# Compare with all available columns
all_columns = df.columns.tolist()
not_selected_columns = [col for col in all_columns if col not in source_columns]

# Print columns that are not selected
print("Columns not selected:", not_selected_columns)

# Filter the DataFrame to include only selected source columns
missing_columns = sorted(set(source_columns) - set(df.columns))
if missing_columns:
    raise KeyError(f"Missing Airtable columns: {missing_columns}")
df = df[source_columns]

# Empty Airtable form rows are not entities and cannot provide a stable join key.
df = df[df["entity"].notna() & df["entity"].ne("")]
df["entity"] = df["entity"].map(normalize_entity)

duplicate_entities = sorted(
    df.loc[df["entity"].duplicated(keep=False), "entity"].unique().tolist()
)
if duplicate_entities:
    raise ValueError(f"Duplicate entity names: {duplicate_entities}")

# The current Airtable taxonomy is maintained directly in `category`.
# Where it is empty, the principal-organ field supplies organization families.
def system_grouping(row):
    if pd.notna(row["category"]):
        return row["category"]
    principal_organs = row["un_principal_organ"]
    if not isinstance(principal_organs, list):
        return None
    fallbacks = [
        grouping
        for principal_organ, grouping in (
            ("Specialized Agencies", "Specialized Agencies"),
            ("Related Organizations", "Related Organizations"),
            ("Secretariat", "UN Secretariat"),
        )
        if principal_organ in principal_organs
    ]
    if len(fallbacks) > 1:
        raise ValueError(
            f"Ambiguous principal-organ fallback for {row['entity']}: {fallbacks}"
        )
    return fallbacks[0] if fallbacks else None


df["system_grouping"] = df.apply(system_grouping, axis=1)
category_normalizations = {
    "Other": "Other Entities",
    "Other Bodies and Committees": "Other Entities",
    "Subsidiary Organs": "Other Entities",
}
df["category"] = df["category"].replace(category_normalizations)
df["system_grouping"] = df["system_grouping"].replace(category_normalizations)

output_path = Path("public/data/entities.json")
df = pd.DataFrame(include_ceb_aggregate_entities(df.to_dict(orient="records")))
df = df[output_columns]
df.to_json(output_path, orient="records", indent=2)
