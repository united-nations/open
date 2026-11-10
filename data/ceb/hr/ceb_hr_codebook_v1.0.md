# CEB Personnel Statistics: Codebook for downloadable data

## About

**Data:** staff of United Nations system organizations covered by the CEB Personnel Statistics from 2017 to 2025, as published on the CEB [Data for download](https://unsceb.org/data-download) page. Codebook version 1.0, 27 October 2026.

**Who is counted:** staff who, on 31 December of each year, either held a contract of at least one year or had been employed for at least one year.

**Updates:** once a year, after the annual data collection. Data for earlier years are revised only in exceptional cases; the data change log on the [Human Resources Statistics page](https://unsceb.org/statistics/human-resources-statistics) lists each revision.

**Terms and names:** terms follow the [UN System HR Analytics Framework, Version 1.0 (2026)](https://unsceb.org/products/un-system-hr-analytics-framework/); the names of organizations, countries, duty stations and grades follow the public [CEB code lists](https://github.com/CEB-HLCM/HR-Public-Codes).

**Format:** comma-separated values (CSV), encoded in UTF-8 with a byte order mark, so that spreadsheet programs show accented names correctly. NA means ‘not reported’ or ‘not identified’.

**Contact:** the [CEB contact form](https://unsceb.org/contact).

## How the data are produced

1. Each organization extracts the data from its HR systems and compiles them in the CEB standard template for the annual personnel data collection.

2. The organization submits the completed template to the CEB secretariat.

3. The CEB secretariat runs automated validation and consistency checks on each submission, and the organization reviews and corrects any errors identified. The CEB secretariat has no access to the organizations' source records and cannot confirm the accuracy of individual records.

4. The CEB secretariat identifies and removes duplicate records within each submission and across organizations. Duplicates across organizations can arise, for example, when both the releasing and receiving organizations report a staff member who is on loan or secondment, contrary to the reporting instructions (see Loan and secondment under Definitions); in that case, the CEB secretariat retains the record that follows these instructions.

5. The CEB secretariat consolidates the submissions, adds names, regions and groupings from the CEB code lists, and publishes the files on the CEB website.

The submitting organizations remain responsible for the accuracy and completeness of their data.

## Definitions

| TERM | MEANING |
|---|---|
| Staff | Persons appointed under an organization's staff regulations and rules. Included: staff with a contract of at least one year or at least one year of employment; staff on temporary appointments are counted once they have been employed for at least one year. Associate experts (JPOs, APOs) and cost-free experts who hold a staff contract are staff and are counted. Excluded: consultants, individual contractors and other affiliates (non-staff personnel). |
| Reference year | The year the data describe. Staff are counted on 31 December of that year. |
| Organization | A United Nations system organization covered by the CEB Personnel Statistics. The CEB secretariat, JIU and ICSC (jointly financed activities) and UNJSPF (an independent inter-agency entity) are reported separately from the United Nations Secretariat in the downloadable files. |
| UN entity | A department, office or mission of the United Nations Secretariat. In the files, the United Nations Secretariat is identified as UN. Only organization.csv breaks UN down by entity. |
| Staff category | International Professional (the Professional and higher categories), National Professional, Field Service or General Service. |
| Grade | The grade as reported. Some values group several grades, such as UG for all levels above D-2 (see Code lists). |
| Subcategory | A grouping of grades within a staff category, created for these files: High (High-level for International Professionals), Junior - Mid, and Other grades for grades without a defined level. |
| Duty station | The place, usually a city, where the staff member is assigned. |
| Nationality | The nationality as reported, by country. ‘Unclear’ indicates that nationality was not reported or could not be identified. |
| Sex | As reported: F female, M male. |
| Age | The staff member's age on 31 December, in full years. |
| Length of service | The number of full years the staff member had served in the organization by 31 December, calculated from the reported date of entry to the organization. |
| Loan and secondment | A staff member on loan on 31 December is reported by the releasing organization; a seconded staff member is reported by the receiving organization. Each is counted once. |
| Region, subregion | As in the UN M49 standard. Recorded as ‘Not identified’ when the country is unknown. |
| NA | Not reported, or not identified. |
| Missing row | The absence of a combination from a file indicates that no staff were recorded for that combination in that year. |

## Files

| FILE | TITLE | EACH ROW REPRESENTS |
|---|---|---|
| organization.csv | Personnel By Organization | one organization in one year; for the United Nations Secretariat, one entity in one year |
| composition.csv | Personnel By Grade and Gender | one organization, category, subcategory, grade and sex in one year |
| duty_station.csv | Personnel By Location of Duty | one organization at one duty station in one year |
| nationality.csv | Personnel By Nationality | one organization and one nationality in one year |
| others.csv | Personnel By Age and Tenure | one combination of sex, age and length of service in one year, across all organizations |

## Columns

### organization.csv

| COLUMN | VALUES | MEANING |
|---|---|---|
| YEAR | year | Reference year. |
| ORG | short name | Organization (see Code lists). |
| ENTITY | code or NA | UN entity; NA for other organizations and for UN staff without a reported entity. |
| COUNT | whole number | Number of staff. |

### composition.csv

| COLUMN | VALUES | MEANING |
|---|---|---|
| ORG | short name | As in organization.csv. |
| CATEGORY | four categories | Staff category. |
| SUBCATEGORY | see Definitions | Subcategory of the staff category. |
| GRADE | see Code lists | Grade, or a group of grades. |
| SEX | F, M, NA | Sex. |
| YEAR | year | Reference year. |
| COUNT | whole number | Number of staff. |

### duty_station.csv

| COLUMN | VALUES | MEANING |
|---|---|---|
| YEAR | year | Reference year. |
| REGION | M49 region or Not identified | Region of the duty station country. |
| SUBREGION | M49 subregion or Not identified | Subregion of the duty station country. |
| ISO | ISO 3166-1 alpha-3 or NA | Code of the duty station country. |
| COUNTRY | country name or NA | Duty station country. |
| DS | duty station name or NA | Duty station. |
| ORG | short name | As in organization.csv. |
| COUNT | whole number | Number of staff. |

### nationality.csv

| COLUMN | VALUES | MEANING |
|---|---|---|
| REGION | M49 region or Not identified | Region of the country of nationality. |
| SUBREGION | M49 subregion or Not identified | Subregion of the country of nationality. |
| COUNTRY | country name or Unclear | Nationality. |
| ORG | short name | As in organization.csv. |
| YEAR | year | Reference year. |
| ISO | ISO 3166-1 alpha-3 or NA | Code of the country of nationality. |
| COUNT | whole number | Number of staff. |

### others.csv

| COLUMN | VALUES | MEANING |
|---|---|---|
| YEAR | year | Reference year. |
| SEX | F, M, NA | Sex. |
| TENURE | whole number or NA | Length of service. |
| TENURE_BAND | band | Length of service in five-year bands, from under 5 years to 40 years or more. |
| AGE_BAND | band | Age in five-year bands, from under 25 years to 65 years or older. |
| AGE | whole number or NA | Age. |
| COUNT | whole number | Number of staff across all organizations. |

## Code lists

The organizations, grades, nationalities, countries and duty stations in the files are those of the public CEB code lists, where they are maintained:

- Organizations: [ORGCD.csv](https://github.com/CEB-HLCM/HR-Public-Codes/blob/main/ORGCD.csv). ORG in the files is ORG_REPORTING_NAME there; ORG_LONG_NAME gives the full name.

- Grades: [GRADE.csv](https://github.com/CEB-HLCM/HR-Public-Codes/blob/main/GRADE.csv), with the name of each grade, its staff category (STAFF_CATEGORY) and its grade and subcategory in the files (WEBSITE_GRADE, WEBSITE_STAFF_SUBCATEGORY).

- Nationalities: [NATCD.csv](https://github.com/CEB-HLCM/HR-Public-Codes/blob/main/NATCD.csv).

- Duty-station countries: [DSCTRYCD.csv](https://github.com/CEB-HLCM/HR-Public-Codes/blob/main/DSCTRYCD.csv).

- Duty stations: [DSCITYCD.csv](https://github.com/CEB-HLCM/HR-Public-Codes/blob/main/DSCITYCD.csv).

## Notes

### Organizations

The CEB secretariat, JIU and ICSC are jointly financed activities and UNJSPF is an independent inter-agency entity; they are therefore reported separately from the United Nations Secretariat in the downloadable files. The CEB Personnel Statistics reports include the CEB secretariat and JIU under the United Nations Secretariat.

### Names

Organizations, UN entities, countries and duty stations are identified by their current names for all years. Accordingly, UN Tourism is used for earlier years in which the organization was known as UNWTO.

ICC is the International Criminal Court; UNICC is the United Nations International Computing Centre.

### Comparing with other sources

When HR figures from different sources do not agree, the most likely reason is that they include different categories of personnel. These files include only staff with a contract of at least one year or at least one year of employment. They do not include staff who have shorter contracts and have been employed for less than one year, or affiliates (non-staff personnel).

Smaller differences may come from timing. HR data are extracted from the organizations' HR systems, where administrative changes may be recorded after the reference date, sometimes with retroactive effect. HR figures for the same reference date can therefore differ slightly between sources, such as these files, the CEB Personnel Statistics reports and the organizations' own publications, depending on when exactly the data were extracted. Comparisons should allow for a small margin of variation.

## Links

- [Data for download (all files)](https://unsceb.org/data-download)
- [Personnel By Organization: organization.csv](https://unsceb.org/assets/data/HR/organization.csv)
- [Personnel By Grade and Gender: composition.csv](https://unsceb.org/assets/data/HR/composition.csv)
- [Personnel By Location of Duty: duty_station.csv](https://unsceb.org/assets/data/HR/duty_station.csv)
- [Personnel By Nationality: nationality.csv](https://unsceb.org/assets/data/HR/nationality.csv)
- [Personnel By Age and Tenure: others.csv](https://unsceb.org/assets/data/HR/others.csv)
- [Personnel By Organization: staff by organization and year](https://unsceb.org/statistics/hr-organization/)
- [Human resources statistics and the CEB Personnel Statistics reports](https://unsceb.org/statistics/human-resources-statistics)
- [CEB code lists for the HR data (organizations, nationalities, duty stations, grades)](https://github.com/CEB-HLCM/HR-Public-Codes)
- [UN System HR Analytics Framework, Version 1.0 (2026)](https://unsceb.org/products/un-system-hr-analytics-framework/)
