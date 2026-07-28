/**
 * When Will My AYN Thor Ship?
 *
 * Expected layout on every model tab:
 * B4 = today's date
 * C4 = latest order number shipped
 * D4 = average units shipped per day
 *
 * Change the cell references below if your actual sheet differs.
 */

const CONFIG = {
  TODAY_CELL: 'B4',
  SHIPPED_TO_DATE_CELL: 'C4',
  AVERAGE_PER_DAY_CELL: 'D4',

  // Estimated transit time after shipping.
  DHL_TRANSIT_DAYS: 7,
  FOUR_PX_TRANSIT_DAYS: 20
};

/**
 * The visible model name maps to the exact Google Sheets tab name.
 * Change the value on the right if one of your tabs is named differently.
 */
const MODEL_SHEETS = {
  'Black Lite': 'Black Lite',
  'Black Base': 'Black Base',
  'Black Pro': 'Black Pro',
  'Black Max (512)': 'Black Max (512)',
  'Black Max (1TB)': 'Black Max (1TB)',

  'White Pro': 'White Pro',
  'White Max (512)': 'White Max (512)',
  'White Max (1TB)': 'White Max (1TB)',

  'Rainbow Pro': 'Rainbow Pro',
  'Rainbow Max (512)': 'Rainbow Max (512)',
  'Rainbow Max (1TB)': 'Rainbow Max (1TB)',

  'Clear Purple Pro': 'Clear Purple Pro',
  'Clear Purple Max (512)': 'Clear Purple Max (512)',
  'Clear Purple Max (1TB)': 'Clear Purple Max (1TB)'
};


/**
 * Loads the website.
 */
function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');

  template.models = Object.keys(MODEL_SHEETS);

  return template
    .evaluate()
    .setTitle('When Will My AYN Thor Ship?')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * Called by the website when the visitor clicks the estimate button.
 *
 * @param {string} model Selected Thor model.
 * @param {number|string} orderNumber Customer order number.
 * @return {Object} Shipping estimate.
 */
function estimateShipping(model, orderNumber) {
  try {
    const cleanedModel = String(model || '').trim();
    const cleanedOrderNumber = parseOrderNumber_(orderNumber);

    if (!MODEL_SHEETS[cleanedModel]) {
      throw new Error('Please select a valid Thor model.');
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = MODEL_SHEETS[cleanedModel];
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error(
        'The sheet tab "' + sheetName + '" could not be found.'
      );
    }

    const shippedToDate = parseNumericCell_(
      sheet.getRange(CONFIG.SHIPPED_TO_DATE_CELL).getValue(),
      'orders shipped to date'
    );

    const averagePerDay = parseNumericCell_(
      sheet.getRange(CONFIG.AVERAGE_PER_DAY_CELL).getValue(),
      'average shipped per day'
    );

    let calculationDate = sheet
      .getRange(CONFIG.TODAY_CELL)
      .getValue();

    if (!(calculationDate instanceof Date) || isNaN(calculationDate)) {
      calculationDate = new Date();
    }

    calculationDate = dateOnly_(calculationDate);

    if (averagePerDay <= 0) {
      throw new Error(
        'The average shipping rate must be greater than zero.'
      );
    }

    const ordersAhead = Math.max(
      0,
      cleanedOrderNumber - shippedToDate
    );

    const daysUntilShipping = Math.ceil(
      ordersAhead / averagePerDay
    );

    const estimatedShipDate = addDays_(
      calculationDate,
      daysUntilShipping
    );

    const estimatedDhlDate = addDays_(
      estimatedShipDate,
      CONFIG.DHL_TRANSIT_DAYS
    );

    const estimatedFourPxDate = addDays_(
      estimatedShipDate,
      CONFIG.FOUR_PX_TRANSIT_DAYS
    );

    return {
      success: true,
      model: cleanedModel,
      orderNumber: cleanedOrderNumber,
      shippedToDate: shippedToDate,
      averagePerDay: averagePerDay,
      ordersAhead: ordersAhead,
      daysUntilShipping: daysUntilShipping,

      shipDate: formatDate_(estimatedShipDate),
      dhlDate: formatDate_(estimatedDhlDate),
      fourPxDate: formatDate_(estimatedFourPxDate),

      alreadyReached:
        cleanedOrderNumber <= shippedToDate
    };

  } catch (error) {
    console.error(error);

    return {
      success: false,
      message:
        error && error.message
          ? error.message
          : 'Something went wrong while calculating the estimate.'
    };
  }
}


/**
 * Converts the submitted order number into a positive whole number.
 */
function parseOrderNumber_(value) {
  const text = String(value || '').replace(/[^0-9]/g, '');
  const number = Number(text);

  if (!Number.isFinite(number) || number <= 0) {
    throw new Error('Enter a valid order number.');
  }

  return Math.floor(number);
}


/**
 * Validates a numeric spreadsheet cell.
 */
function parseNumericCell_(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(
      'The ' + fieldName + ' value is missing or invalid.'
    );
  }

  return number;
}


/**
 * Removes the time portion of a date.
 */
function dateOnly_(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}


/**
 * Adds calendar days to a date.
 */
function addDays_(date, numberOfDays) {
  const result = new Date(date);
  result.setDate(result.getDate() + numberOfDays);
  return result;
}


/**
 * Formats dates using the spreadsheet's timezone.
 */
function formatDate_(date) {
  const timezone =
    SpreadsheetApp.getActiveSpreadsheet()
      .getSpreadsheetTimeZone() ||
    Session.getScriptTimeZone();

  return Utilities.formatDate(
    date,
    timezone,
    'MMMM d, yyyy'
  );
}