// Where the peacekeeping operations and special political missions belong on a
// map. The financial data has no location column, so this table is hand-made
// from the mission web sites, DPPA/DPO fact sheets and Security Council reports.
//
// `code` matches the `entity` field in public/data/secretariat-{year}.json.
// Everything that appears in the peacekeeping budget part, in section 5
// (Peacekeeping operations) or in section 3 (Political affairs) is listed here,
// either with a place or in EXCLUDED_FROM_MAP with a reason. Nothing is dropped
// in silence.
//
// PLACEMENT RULE — the point marks the area the mission is about, not the
// address of its office. This follows the UN's own practice: DPPA lists the
// Syria envoy under Syria and the Yemen envoy under Yemen, although both sit in
// other countries. SIPRI prints the same caveat on its peace operations map:
// "The markers aim to reflect the location of the operation, but do not show
// their exact site of deployment or headquarters."
//
// Where the mandate is one country or territory, the point is that area's
// representative point, taken from the same world map file the chart draws, so
// the dot always falls inside its own shape.
//
// Disputed areas keep their own name and get `iso3: null`. The UN never assigns
// them to a state, and neither do we.

export type MissionKind = "pko" | "spm" | "support";

/** What kind of area the mandate covers, which is what the point represents. */
export type AreaKind =
  | "country" // one member state
  | "territory" // a territory that is not a member state
  | "subnational" // a named part of one country
  | "region"; // several countries at once

export type LocationCertainty =
  | "certain" // the area is clear and the point sits well inside it
  | "approximate" // the area is large, spread out, or the mission moved
  | "contested"; // the area itself is disputed, so it has no undisputed state

export interface MissionLocation {
  /** Entity code, as in secretariat-{year}.json */
  code: string;
  /** Official name */
  name: string;
  kind: MissionKind;
  /** The area the mission is about, named the way the UN names it */
  area: string;
  areaKind: AreaKind;
  /** ISO 3166-1 alpha-3, or null where there is no undisputed country code */
  iso3: string | null;
  lat: number;
  long: number;
  certainty: LocationCertainty;
  /**
   * True when the mission's office is in a different country than the area it
   * works on. The dot is on the area, so these are the entries where the
   * general note below matters most.
   */
  officeElsewhere?: boolean;
  /** Why the point is approximate or contested, and other things to know */
  note?: string;
}

/**
 * One general note for the map, instead of an office address on every entry.
 * The offices are researched, but they are not what the map shows.
 */
export const PLACEMENT_NOTE =
  "Each dot marks the area a mission works on, not the address of its office. " +
  "Several offices sit in another country than the one they work on — the envoy " +
  "for Syria works from Geneva, the envoy for Yemen from Amman, and the envoys " +
  "for the Great Lakes and the Horn of Africa from Nairobi. Missions that cover " +
  "a region, or a part of a country, are put at a representative point of that area.";

/** The standard UN wording for any map that shows disputed areas. */
export const BOUNDARY_DISCLAIMER =
  "The designations employed and the presentation of material on this map do not " +
  "imply the expression of any opinion whatsoever on the part of the Secretariat " +
  "of the United Nations concerning the legal status of any country, territory, " +
  "city or area or of its authorities, or concerning the delimitation of its " +
  "frontiers or boundaries.";

/** The UN adds this second note wherever Jammu and Kashmir is shown. */
export const KASHMIR_DISCLAIMER =
  "The dotted line represents approximately the Line of Control in Jammu and " +
  "Kashmir agreed upon by India and Pakistan. The final status of Jammu and " +
  "Kashmir has not yet been agreed upon by the parties.";

// ---------------------------------------------------------------------------
// Peacekeeping operations
// ---------------------------------------------------------------------------

export const PEACEKEEPING_LOCATIONS: MissionLocation[] = [
  {
    code: "MONUSCO",
    name: "UN Organization Stabilization Mission in the Democratic Republic of the Congo",
    kind: "pko",
    area: "Eastern Democratic Republic of the Congo",
    areaKind: "subnational",
    iso3: "COD",
    lat: -1.6771,
    long: 29.2213,
    certainty: "approximate",
    note: "The mandate covers the whole country, but the recent resolutions focus the mission on North Kivu, South Kivu and Ituri, and nearly all troops and spending are there. The point is near Goma. The mission headquarters is in Kinshasa, about 1,600 km west.",
  },
  {
    code: "UNMISS",
    name: "UN Mission in South Sudan",
    kind: "pko",
    area: "South Sudan",
    areaKind: "country",
    iso3: "SSD",
    lat: 7.3033,
    long: 30.3187,
    certainty: "certain",
  },
  {
    code: "MINUSMA",
    name: "UN Multidimensional Integrated Stabilization Mission in Mali",
    kind: "pko",
    area: "Mali",
    areaKind: "country",
    iso3: "MLI",
    lat: 17.3601,
    long: -3.5278,
    certainty: "certain",
    note: "Closed on 31 December 2023, so it is in the data for 2019-2023 and then stops.",
  },
  {
    code: "MINUSCA",
    name: "UN Multidimensional Integrated Stabilization Mission in the Central African Republic",
    kind: "pko",
    area: "Central African Republic",
    areaKind: "country",
    iso3: "CAF",
    lat: 6.578,
    long: 20.4841,
    certainty: "certain",
  },
  {
    code: "UNAMID",
    name: "African Union-UN Hybrid Operation in Darfur",
    kind: "pko",
    area: "Darfur",
    areaKind: "subnational",
    iso3: "SDN",
    lat: 13.2,
    long: 24.3,
    certainty: "approximate",
    note: "Joint mission with the African Union, in the five Darfur states in western Sudan, not in the whole country. Closed on 31 December 2020; the 2021-2023 amounts are the liquidation.",
  },
  {
    code: "UNIFIL",
    name: "UN Interim Force in Lebanon",
    kind: "pko",
    area: "Southern Lebanon",
    areaKind: "subnational",
    iso3: "LBN",
    lat: 33.3,
    long: 35.4,
    certainty: "certain",
    note: "The area of operations is between the Litani river and the Blue Line, not the whole of Lebanon.",
  },
  {
    code: "UNISFA",
    name: "UN Interim Security Force for Abyei",
    kind: "pko",
    area: "Abyei Area",
    areaKind: "territory",
    iso3: null,
    lat: 9.59,
    long: 28.44,
    certainty: "contested",
    note: "Abyei is claimed by both Sudan and South Sudan and has no country code of its own. Note that the world map file used by the chart has no Abyei shape and draws this ground as part of South Sudan, so the dot will sit inside South Sudan. Do not colour a country for this dot.",
  },
  {
    code: "UNDOF",
    name: "UN Disengagement Observer Force",
    kind: "pko",
    area: "Golan",
    areaKind: "territory",
    iso3: null,
    lat: 33.1,
    long: 35.85,
    certainty: "contested",
    note: "The area of separation on the Golan, which is Syrian territory occupied by Israel. The world map file draws this ground as Syria.",
  },
  {
    code: "MINURSO",
    name: "UN Mission for the Referendum in Western Sahara",
    kind: "pko",
    area: "Western Sahara",
    areaKind: "territory",
    iso3: "ESH",
    lat: 24.6631,
    long: -13.1351,
    certainty: "contested",
    note: "A non-self-governing territory. It has its own shape and its own code in the world map file used by the chart.",
  },
  {
    code: "UNFICYP",
    name: "UN Peacekeeping Force in Cyprus",
    kind: "pko",
    area: "Cyprus buffer zone",
    areaKind: "subnational",
    iso3: "CYP",
    lat: 35.1,
    long: 33.3,
    certainty: "approximate",
    note: "The buffer zone runs about 180 km across the island. The point is near its middle, at Nicosia.",
  },
  {
    code: "UNMIK",
    name: "UN Interim Administration Mission in Kosovo",
    kind: "pko",
    area: "Kosovo",
    areaKind: "territory",
    iso3: null,
    lat: 42.5799,
    long: 20.8831,
    certainty: "contested",
    note: "The world map file used by the chart has a shape for it, named 'Kosovo (as per UNSCR 1244)'. It has no official ISO 3166 code.",
  },
  {
    code: "MINUJUSTH",
    name: "UN Mission for Justice Support in Haiti",
    kind: "pko",
    area: "Haiti",
    areaKind: "country",
    iso3: "HTI",
    lat: 18.9712,
    long: -72.2852,
    certainty: "certain",
    note: "Closed on 15 October 2019 and replaced by BINUH, a special political mission for the same country. Only in the 2019 and 2020 data.",
  },
  {
    code: "UNTSO",
    name: "UN Truce Supervision Organization",
    kind: "pko",
    area: "Middle East",
    areaKind: "region",
    iso3: null,
    lat: 32.5,
    long: 35.5,
    certainty: "contested",
    note: "UN Peacekeeping lists the area as 'Middle East'. Observers work in Egypt, Israel, Jordan, Lebanon and Syria, and the headquarters is Government House in Jerusalem. A peacekeeping operation, but paid from the regular budget, not the peacekeeping budget.",
  },
  {
    code: "UNMOGIP",
    name: "UN Military Observer Group in India and Pakistan",
    kind: "pko",
    area: "Jammu and Kashmir",
    areaKind: "territory",
    iso3: null,
    lat: 34.0,
    long: 75.5,
    certainty: "contested",
    note: "UN Peacekeeping lists the area as 'India and Pakistan'. The observers watch the Line of Control. The world map file used by the chart has a separate 'Jammu and Kashmir' shape, so the dot does not fall in either state. Show the Line of Control note with this dot. Also a peacekeeping operation paid from the regular budget.",
  },
];

// ---------------------------------------------------------------------------
// Peacekeeping support entities. Paid from the peacekeeping budget, and in the
// data next to the missions, but they are facilities and back offices, not
// operations with a mandate over an area. For these the site IS the thing, so
// office and area are the same place.
// ---------------------------------------------------------------------------

export const PEACEKEEPING_SUPPORT_LOCATIONS: MissionLocation[] = [
  {
    code: "UNSOS",
    name: "UN Support Office in Somalia",
    kind: "support",
    area: "Somalia",
    areaKind: "country",
    iso3: "SOM",
    lat: 4.5,
    long: 45.5,
    certainty: "certain",
    officeElsewhere: true,
    note: "Delivers logistics to the African Union mission and to UNSOM. A large part of the office and of the supply chain sits in Nairobi and Mombasa in Kenya.",
  },
  {
    code: "UNLB",
    name: "UN Global Service Centre, Brindisi",
    kind: "support",
    area: "Brindisi",
    areaKind: "subnational",
    iso3: "ITA",
    lat: 40.658,
    long: 17.947,
    certainty: "approximate",
    note: "A facility, not a mandate area, so the point is the site itself. It serves every mission worldwide, and has a second site in Valencia in Spain. The budget files also call it UNGSC.",
  },
  {
    code: "RSCE",
    name: "Regional Service Centre in Entebbe",
    kind: "support",
    area: "Entebbe",
    areaKind: "subnational",
    iso3: "UGA",
    lat: 0.05,
    long: 32.44,
    certainty: "approximate",
    note: "A facility, not a mandate area. It does back-office work for the missions in Africa.",
  },
  {
    code: "UNOAU",
    name: "UN Office to the African Union",
    kind: "support",
    area: "African Union headquarters, Addis Ababa",
    areaKind: "subnational",
    iso3: "ETH",
    lat: 9.0192,
    long: 38.7525,
    certainty: "certain",
    note: "The office exists to work with the African Union, which is in Addis Ababa, so the site and the subject are the same place. Paid partly from the peacekeeping budget and partly from section 3, so it appears twice in the data.",
  },
  {
    code: "AMISOM",
    name: "African Union Mission in Somalia (UN trust fund)",
    kind: "support",
    area: "Somalia",
    areaKind: "country",
    iso3: "SOM",
    lat: 4.5,
    long: 45.5,
    certainty: "certain",
    note: "Not a UN mission. The amount in the data is a UN trust fund in support of an African Union operation, later renamed ATMIS. Drawing it as a UN mission would be wrong.",
  },
];

// ---------------------------------------------------------------------------
// Special political missions with a field mandate
// ---------------------------------------------------------------------------

export const SPM_LOCATIONS: MissionLocation[] = [
  {
    code: "UNAMA",
    name: "UN Assistance Mission in Afghanistan",
    kind: "spm",
    area: "Afghanistan",
    areaKind: "country",
    iso3: "AFG",
    lat: 33.8324,
    long: 66.0279,
    certainty: "certain",
  },
  {
    code: "UNAMI",
    name: "UN Assistance Mission for Iraq",
    kind: "spm",
    area: "Iraq",
    areaKind: "country",
    iso3: "IRQ",
    lat: 33.0513,
    long: 43.767,
    certainty: "certain",
  },
  {
    code: "UNSOM",
    name: "UN Assistance Mission in Somalia",
    kind: "spm",
    area: "Somalia",
    areaKind: "country",
    iso3: "SOM",
    lat: 4.5,
    long: 45.5,
    certainty: "certain",
    note: "Replaced by UNTMIS on 1 November 2024, after the end of this data window.",
  },
  {
    code: "UNSMIL",
    name: "UN Support Mission in Libya",
    kind: "spm",
    area: "Libya",
    areaKind: "country",
    iso3: "LBY",
    lat: 27.0382,
    long: 18.0307,
    certainty: "certain",
    officeElsewhere: true,
    note: "The mission left Tripoli in 2014 and worked from Tunis for years, and only moved back step by step, so for 2019 and 2020 much of the money was spent in Tunisia.",
  },
  {
    code: "UNVMC",
    name: "UN Verification Mission in Colombia",
    kind: "spm",
    area: "Colombia",
    areaKind: "country",
    iso3: "COL",
    lat: 3.9029,
    long: -73.0792,
    certainty: "certain",
  },
  {
    code: "UNMHA",
    name: "UN Mission to Support the Hodeidah Agreement",
    kind: "spm",
    area: "Hodeidah",
    areaKind: "subnational",
    iso3: "YEM",
    lat: 14.8,
    long: 43.1,
    certainty: "approximate",
    note: "The mandate is the Hodeidah governorate and its ports, not the whole of Yemen. There is also a support office in Aden.",
  },
  {
    code: "UNITAMS",
    name: "UN Integrated Transition Assistance Mission in the Sudan",
    kind: "spm",
    area: "Sudan",
    areaKind: "country",
    iso3: "SDN",
    lat: 16.0038,
    long: 29.9501,
    certainty: "certain",
    note: "Moved from Khartoum to Port Sudan in April 2023 when the war started. Mandate ended February 2024.",
  },
  {
    code: "UNITAD",
    name: "UN Investigative Team to Promote Accountability for Crimes Committed by Da'esh",
    kind: "spm",
    area: "Iraq",
    areaKind: "country",
    iso3: "IRQ",
    lat: 33.0513,
    long: 43.767,
    certainty: "certain",
    note: "Mandate ended September 2024. Same area as UNAMI, so the two dots sit on top of each other.",
  },
  {
    code: "BINUH",
    name: "UN Integrated Office in Haiti",
    kind: "spm",
    area: "Haiti",
    areaKind: "country",
    iso3: "HTI",
    lat: 18.9712,
    long: -72.2852,
    certainty: "certain",
  },
  {
    code: "UNIOGBIS",
    name: "UN Integrated Peacebuilding Office in Guinea-Bissau",
    kind: "spm",
    area: "Guinea-Bissau",
    areaKind: "country",
    iso3: "GNB",
    lat: 12.0084,
    long: -14.9853,
    certainty: "certain",
    note: "Closed on 31 December 2020.",
  },
  {
    code: "UNSCO",
    name: "Office of the UN Special Coordinator for the Middle East Peace Process",
    kind: "spm",
    area: "Occupied Palestinian Territory",
    areaKind: "territory",
    iso3: "PSE",
    lat: 31.9418,
    long: 35.2541,
    certainty: "contested",
    note: "The office is in Jerusalem, whose status is disputed, with a further office in Gaza. UN Peacekeeping and DPPA both list the place as 'Jerusalem' rather than as a state.",
  },
  {
    code: "UNSCOL",
    name: "Office of the UN Special Coordinator for Lebanon",
    kind: "spm",
    area: "Lebanon",
    areaKind: "country",
    iso3: "LBN",
    lat: 33.9202,
    long: 35.8974,
    certainty: "certain",
  },
  {
    code: "UNOWAS",
    name: "UN Office for West Africa and the Sahel",
    kind: "spm",
    area: "West Africa and the Sahel",
    areaKind: "region",
    iso3: null,
    lat: 14.0,
    long: -3.0,
    certainty: "approximate",
    officeElsewhere: true,
    note: "A regional office in Dakar covering all of West Africa and the Sahel. The point is a middle of that region, not the office.",
  },
  {
    code: "UNOCA",
    name: "UN Regional Office for Central Africa",
    kind: "spm",
    area: "Central Africa",
    areaKind: "region",
    iso3: null,
    lat: 3.0,
    long: 17.0,
    certainty: "approximate",
    officeElsewhere: true,
    note: "A regional office in Libreville covering eleven countries. The point is a middle of that region, not the office.",
  },
  {
    code: "UNRCCA",
    name: "UN Regional Centre for Preventive Diplomacy for Central Asia",
    kind: "spm",
    area: "Central Asia",
    areaKind: "region",
    iso3: null,
    lat: 42.0,
    long: 64.0,
    certainty: "approximate",
    officeElsewhere: true,
    note: "A regional centre in Ashgabat covering five countries. The point is a middle of that region, not the office.",
  },
  {
    code: "OSESG-Yemen",
    name: "Office of the Special Envoy of the Secretary-General for Yemen",
    kind: "spm",
    area: "Yemen",
    areaKind: "country",
    iso3: "YEM",
    lat: 15.9068,
    long: 47.5941,
    certainty: "certain",
    officeElsewhere: true,
    note: "The office is in Amman in Jordan, with staff in Sana'a and Aden. DPPA lists this mission under Yemen.",
  },
  {
    code: "OSESG-GL",
    name: "Office of the Special Envoy of the Secretary-General for the Great Lakes Region",
    kind: "spm",
    area: "Great Lakes region",
    areaKind: "region",
    iso3: null,
    lat: -2.0,
    long: 29.5,
    certainty: "approximate",
    officeElsewhere: true,
    note: "The office is at the UN compound in Nairobi. DPPA lists this mission under 'DRC/Great Lakes'. The point is between eastern DRC, Rwanda, Burundi and Uganda.",
  },
  {
    code: "OSESG-Horn",
    name: "Office of the Special Envoy of the Secretary-General for the Horn of Africa",
    kind: "spm",
    area: "Horn of Africa",
    areaKind: "region",
    iso3: null,
    lat: 8.0,
    long: 42.0,
    certainty: "approximate",
    officeElsewhere: true,
    note: "The office is in Nairobi, hosted at UNEP. The mandate covers the member states of IGAD.",
  },
  {
    code: "OSESG-FG",
    name: "Office of the Special Envoy of the Secretary-General for Burundi",
    kind: "spm",
    area: "Burundi",
    areaKind: "country",
    iso3: "BDI",
    lat: -3.3695,
    long: 29.8876,
    certainty: "certain",
    note: "The code OSESG-FG is not obvious; the fund labels in the data name it as the Burundi office. Closed on 31 May 2021.",
  },
  {
    code: "OJSRS",
    name: "Office of the Special Envoy of the Secretary-General for Syria",
    kind: "spm",
    area: "Syrian Arab Republic",
    areaKind: "country",
    iso3: "SYR",
    lat: 35.0199,
    long: 38.4956,
    certainty: "certain",
    officeElsewhere: true,
    note: "The office is at the Palais des Nations in Geneva, where the talks are held. DPPA lists this mission under Syria.",
  },
  {
    code: "OSASG-Cyprus",
    name: "Office of the Special Adviser to the Secretary-General on Cyprus",
    kind: "spm",
    area: "Cyprus",
    areaKind: "country",
    iso3: "CYP",
    lat: 35.0495,
    long: 33.2123,
    certainty: "certain",
    note: "The code SASG-Cyp in the 2020 file is the same office under another spelling.",
  },
  {
    code: "OSESG-SCRES1559",
    name: "Office of the Special Envoy for the implementation of Security Council resolution 1559 (2004)",
    kind: "spm",
    area: "Lebanon",
    areaKind: "country",
    iso3: "LBN",
    lat: 33.9202,
    long: 35.8974,
    certainty: "certain",
    officeElsewhere: true,
    note: "Resolution 1559 is about Lebanon. The envoy has been New York based in some years and works with UNSCOL in Beirut.",
  },
  {
    code: "CNMC",
    name: "UN support for the Cameroon-Nigeria Mixed Commission",
    kind: "spm",
    area: "Cameroon-Nigeria border",
    areaKind: "subnational",
    iso3: null,
    lat: 8.5,
    long: 11.3,
    certainty: "approximate",
    officeElsewhere: true,
    note: "The commission is serviced by UNOWAS in Dakar, about 3,000 km away. The point is on the border it demarcates, which runs from Lake Chad to the Bakassi peninsula.",
  },
  {
    code: "UNRGID",
    name: "UN Representative to the Geneva International Discussions",
    kind: "spm",
    area: "Georgia",
    areaKind: "country",
    iso3: "GEO",
    lat: 42.1826,
    long: 43.5053,
    certainty: "approximate",
    officeElsewhere: true,
    note: "The talks are held in Geneva and are about Georgia, Abkhazia and South Ossetia. The point is Georgia; the two areas in question are inside it.",
  },
  {
    code: "UNRoD",
    name: "UN Register of Damage caused by the construction of the wall in the Occupied Palestinian Territory",
    kind: "spm",
    area: "Occupied Palestinian Territory",
    areaKind: "territory",
    iso3: "PSE",
    lat: 31.9418,
    long: 35.2541,
    certainty: "contested",
    officeElsewhere: true,
    note: "The office is at the Vienna International Centre; the claims come from the West Bank. The code UNROD in the 2020 file is the same office.",
  },
];

// ---------------------------------------------------------------------------
// Everything else in the same budget lines, and why it is not on the map.
//
// Note on the panels of experts: under the UN's own budget definition they ARE
// special political missions — thematic cluster II of the 36 missions in the
// annual estimates. They are off this map for the reason the UN itself uses,
// which is that they are not field missions. DPPA's field mission list has
// about twelve special political missions, not thirty-six.
// ---------------------------------------------------------------------------

export const EXCLUDED_FROM_MAP: Array<{ code: string; reason: string }> = [
  // New York headquarters departments and offices
  { code: "DPO", reason: "Headquarters department in New York, not a mission." },
  { code: "DPPA", reason: "Headquarters department in New York, not a mission." },
  { code: "OCT", reason: "Office of Counter-Terrorism, New York." },
  { code: "CTED", reason: "Counter-Terrorism Committee Executive Directorate, New York." },
  { code: "UNAOC", reason: "Alliance of Civilizations, New York." },
  { code: "HSU", reason: "Human Security Unit and its trust fund, New York." },
  { code: "MPTF-PBF", reason: "Peacebuilding Fund. A fund that gives money to others, with no area of its own." },
  { code: "OSRSG Migration", reason: "Special Representative on Migration, New York. A thematic mandate, not an area." },
  { code: "SASG-PGENOCIDE", reason: "Special Adviser on the Prevention of Genocide, New York. A thematic mandate, not an area." },
  { code: "OMBUD-RES1904", reason: "Ombudsperson for the ISIL and Al-Qaida sanctions list, New York. A list, not an area." },
  { code: "PESG-WS", reason: "Personal Envoy for Western Sahara. A good-offices mandate with no field office; MINURSO already carries a dot on Western Sahara." },
  { code: "OSESG-Myanmar", reason: "Special Envoy on Myanmar. Cluster I envoy with no field office, and no access to the country in this period." },
  { code: "UNMAS", reason: "Mine Action Service. A service delivered in about 15 countries at once. One dot cannot show it." },

  // Sanctions panels and monitoring teams. Cluster II special political
  // missions, but not field missions: supported from New York, members travel.
  { code: "ASM-AQMT", reason: "Sanctions monitoring team, New York. Cluster II, not a field mission." },
  { code: "SC-RES1540", reason: "Security Council committee expert group, New York. Cluster II, not a field mission." },
  { code: "SC-RES2231", reason: "Security Council committee expert group, New York. Cluster II, not a field mission." },
  { code: "GoE-DRC", reason: "Group of Experts, New York based with travel. Cluster II, not a field mission." },
  { code: "POE-DPRK", reason: "Panel of Experts, New York based with travel. Cluster II, not a field mission." },
  { code: "POE-MALI", reason: "Panel of Experts, New York based with travel. Cluster II, not a field mission." },
  { code: "POE-SOMALIA", reason: "Panel of Experts, New York based with travel. Cluster II, not a field mission." },
  { code: "PoE-CAR", reason: "Panel of Experts, New York based with travel. Cluster II, not a field mission." },
  { code: "PoE-Haiti", reason: "Panel of Experts, New York based with travel. Cluster II, not a field mission." },
  { code: "PoE-Libya", reason: "Panel of Experts, New York based with travel. Cluster II, not a field mission." },
  { code: "PoE-S.Sudan", reason: "Panel of Experts, New York based with travel. Cluster II, not a field mission." },
  { code: "PoE-Sudan", reason: "Panel of Experts, New York based with travel. Cluster II, not a field mission." },
  { code: "PoE-Yemen", reason: "Panel of Experts, New York based with travel. Cluster II, not a field mission." },

  // Support-account shares. These are headquarters offices that get a slice of
  // the peacekeeping budget for the work they do for the missions.
  { code: "DOS", reason: "Peacekeeping support account share of a headquarters department." },
  { code: "DMSPC", reason: "Peacekeeping support account share of a headquarters department." },
  { code: "DSS", reason: "Peacekeeping support account share of a headquarters department." },
  { code: "OIOS", reason: "Peacekeeping support account share of a headquarters office." },
  { code: "OICT", reason: "Peacekeeping support account share of a headquarters office." },
  { code: "OLA", reason: "Peacekeeping support account share of a headquarters office." },
  { code: "OMBUD", reason: "Peacekeeping support account share of a headquarters office." },
  { code: "OHCHR", reason: "Peacekeeping support account share; OHCHR itself is in Geneva and is not a mission." },
  { code: "EOSG", reason: "Peacekeeping support account share of a headquarters office." },
  { code: "OAJ", reason: "Peacekeeping support account share of a headquarters office." },
  { code: "EO", reason: "Peacekeeping support account share of a headquarters office." },
  { code: "DGC", reason: "Peacekeeping support account share of a headquarters department." },
  { code: "ACABQ", reason: "Peacekeeping support account share of a headquarters body." },
  { code: "OSLA", reason: "Peacekeeping support account share of a headquarters office." },

  // Residuals
  { code: "SPM", reason: "A rounding residual of 213 dollars left over in 2022 after the aggregate special political mission line was split into the individual missions." },
  { code: "OTHER", reason: "Catch-all bucket for rows that could not be matched to an entity." },
];

export const ALL_MAPPED_LOCATIONS: MissionLocation[] = [
  ...PEACEKEEPING_LOCATIONS,
  ...PEACEKEEPING_SUPPORT_LOCATIONS,
  ...SPM_LOCATIONS,
];

export const LOCATION_BY_CODE: Record<string, MissionLocation> = Object.fromEntries(
  ALL_MAPPED_LOCATIONS.map((m) => [m.code, m])
);

/** Spelling variants that appear in single years of the source data. */
export const CODE_ALIASES: Record<string, string> = {
  "SASG-Cyp": "OSASG-Cyprus",
  UNROD: "UNRoD",
  UNGSC: "UNLB",
};
