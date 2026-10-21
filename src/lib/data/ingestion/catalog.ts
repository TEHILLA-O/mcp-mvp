export const CPI_METHODOLOGY =
  "National Bureau of Statistics composite CPI, Table 1 of the September 2026 workbook, titled Base 2024 = 100. Index levels, month-on change and year-on change are stored as printed in that workbook. MCP - MVP does not recompute inflation from the index. The table includes a linked history on the 2024 = 100 base. Early 2025 press releases, including the February 2025 CPI report, quoted a January 2025 headline year-on-year rate of 24.48 percent during the rebase. The September 2026 table prints about 27.61 percent for January 2025, equal to the year-on-year change of the linked index in the same table. Those vintages are not interchangeable. November 2009 = 100 workbooks were inspected and are not loaded.";

export const GDP_METHODOLOGY =
  "Real growth rates are percentage changes in GDP at 2019 constant basic prices, printed in the Q2 2026 GDP workbook. The quarterly total is the row 'GDP at 2019 constant price'. Agriculture, industries and services growth rates are the GROWTH block of the broad-sector sheet. Sector shares are the CONTRIBUTION TO GDP block and are shares of real GDP, not growth rates. Annual real growth for 2020–2023 is 'GDP at Constant Basic Price' in the 2019–2024 rebasing tables. Annual rates for 2024 and 2025 are the annual total columns of the Q2 2026 workbook. The 2024 annual rate agrees across those publications at 3.38 percent. Nominal GDP and the older 2010-price workbook are not mixed into these series.";

export const CPI_SOURCE = "https://microdata.nigerianstat.gov.ng/index.php/catalog/154";
export const CPI_FILE = "https://microdata.nigerianstat.gov.ng/index.php/catalog/154/download/1440";
export const GDP_SOURCE = "https://microdata.nigerianstat.gov.ng/index.php/catalog/147";
export const GDP_Q2_FILE = "https://microdata.nigerianstat.gov.ng/index.php/catalog/147/download/1433";
export const GDP_REBASE_FILE = "https://microdata.nigerianstat.gov.ng/index.php/catalog/147/download/1257";

export const CPI_PUBLICATION = "Consumer Price Index, September 2026 tables (Base 2024 = 100)";
export const GDP_Q2_PUBLICATION = "Nigerian Gross Domestic Product Report, Q2 2026 tables";
export const GDP_REBASE_PUBLICATION = "Rebasing Nigerian Gross Domestic Product, 2019–2024 tables";

export const STATE_ISO: Record<string, string> = {
  Abia: "NG-AB",
  Abuja: "NG-FC",
  Adamawa: "NG-AD",
  "Akwa Ibom": "NG-AK",
  Anambra: "NG-AN",
  Bauchi: "NG-BA",
  Bayelsa: "NG-BY",
  Benue: "NG-BE",
  Borno: "NG-BO",
  "Cross River": "NG-CR",
  Delta: "NG-DE",
  Ebonyi: "NG-EB",
  Edo: "NG-ED",
  Ekiti: "NG-EK",
  Enugu: "NG-EN",
  Gombe: "NG-GO",
  Imo: "NG-IM",
  Jigawa: "NG-JI",
  Kaduna: "NG-KD",
  Kano: "NG-KN",
  Katsina: "NG-KT",
  Kebbi: "NG-KE",
  Kogi: "NG-KO",
  Kwara: "NG-KW",
  Lagos: "NG-LA",
  Nasarawa: "NG-NA",
  Niger: "NG-NI",
  Ogun: "NG-OG",
  Ondo: "NG-ON",
  Osun: "NG-OS",
  Oyo: "NG-OY",
  Plateau: "NG-PL",
  Rivers: "NG-RI",
  Sokoto: "NG-SO",
  Taraba: "NG-TA",
  Yobe: "NG-YO",
  Zamfara: "NG-ZA",
};

export const SHAPE_NAME: Record<string, string> = {
  Abuja: "Abuja Federal Capital Territory",
};
