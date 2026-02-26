function writeToFirestore() {
  const email = "sovereign-hope-mobile@appspot.gserviceaccount.com";
  const keyFromProperties = PropertiesService.getScriptProperties().getProperty(
    "FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY"
  );
  if (!keyFromProperties) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY in Script Properties."
    );
  }

  const key = keyFromProperties.replace(/\\n/g, "\n");
  const projectId = "sovereign-hope-mobile";
  let firestore = FirestoreApp.getFirestore(email, key, projectId);

  // Read from Google Sheets
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let date = new Date();
  let fullYear = date.getFullYear();
  let nextYear = fullYear + 1;

  // If running this for the next year
  // let fullYear = date.getFullYear() + 1;
  // let nextYear = fullYear + 1;

  [fullYear, nextYear].forEach((year) => {
    let readingSheetname = `Bible Reading Plans ${year}`;
    let memorySheetname = `Bible Memory Plan ${year}`;
    let readingSheet = ss.getSheetByName(readingSheetname);
    let memorySheet = ss.getSheetByName(memorySheetname);

    // Get the last row and column in order to define range
    let readingLastRow = readingSheet.getLastRow();
    let readingLastColumn = readingSheet.getLastColumn();
    let memoryLastRow = memorySheet.getLastRow();
    let memoryLastColumn = memorySheet.getLastColumn();
    let readingFirstRow = 3; // First two rows are the plan name and description
    let memoryFirstRow = 1;

    // Define the data range
    let readingSourceRange = readingSheet.getRange(
      readingFirstRow,
      1,
      readingLastRow - readingFirstRow + 1,
      readingLastColumn
    );
    let memorySourceRange = memorySheet.getRange(
      memoryFirstRow,
      1,
      memoryLastRow - memoryFirstRow + 1,
      memoryLastColumn
    );

    // Get the data
    let readingSourceData = readingSourceRange.getValues();
    let readingSourceLength = readingSourceData.length;
    let memorySourceData = memorySourceRange.getValues();
    let memorySourceLength = memorySourceData.length;

    // Suppose there are only 2 plans for now
    const planCount = 2;
    const planColumnCount = 2;

    for (var p = 1; p <= planCount; p++) {
      let firstColumnInPlan = 1 + (p - 1) * planColumnCount;
      let planTitle = readingSheet
        .getRange(1, firstColumnInPlan + 1)
        .getValue();
      let planDescription = readingSheet
        .getRange(2, firstColumnInPlan + 1)
        .getValue();

      // Write to Firestore
      const NUMBER_OF_DAYS = 7;
      let data = {
        weeks: [],
      };
      // Helper to create empty day structure
      const createEmptyDay = () => ({
        reading: [],
        memory: { passage: "", heading: "" },
      });

      let weeks = [
        {
          days: Array.from({ length: NUMBER_OF_DAYS }, createEmptyDay),
        },
      ];

      // Calculate day-of-week offset for January 1st of this year
      // getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      // We want: Monday = 0, Tuesday = 1, ..., Sunday = 6
      let jan1 = new Date(year, 0, 1);
      let jan1DayOfWeek = jan1.getDay();
      let startOffset = jan1DayOfWeek === 0 ? 6 : jan1DayOfWeek - 1;
      // For Jan 1, 2026 (Thursday): getDay() = 4, startOffset = 3

      // Count empty rows at start of data (spreadsheet may have built-in padding)
      let emptyRowsAtStart = 0;
      for (let r = 0; r < readingSourceLength; r++) {
        const reading1 = readingSourceData[r][firstColumnInPlan];
        const reading2 = readingSourceData[r][firstColumnInPlan + 1];
        if (reading1 === "" && reading2 === "") {
          emptyRowsAtStart++;
        } else {
          break;
        }
      }

      for (var i = 0; i < readingSourceLength; i++) {
        // Skip empty rows, then apply day-of-week offset for Jan 1
        // Actual reading index = i - emptyRowsAtStart (only count non-empty rows)
        let readingIndex = i - emptyRowsAtStart;
        if (readingIndex < 0) {
          // This is an empty padding row, skip it
          continue;
        }
        let absoluteDayIndex = readingIndex + startOffset;
        let dayInCurrentWeekIndex = absoluteDayIndex % NUMBER_OF_DAYS;
        let currentWeekIndex = Math.floor(absoluteDayIndex / NUMBER_OF_DAYS);

        // Ensure we have enough weeks
        while (weeks.length <= currentWeekIndex) {
          weeks.push({
            days: Array.from({ length: NUMBER_OF_DAYS }, createEmptyDay),
          });
        }

        // This is just to flexibly work with the plan creators adding multiple
        // readings in a single cell, separated by a semicolon
        // We'll just use the semicolon as the delimiter, merge the columns, and
        // then split them back out into an array
        let currentWeek = weeks[currentWeekIndex];
        let firstDailyReading = readingSourceData[i][firstColumnInPlan];
        let secondDailyReading = readingSourceData[i][firstColumnInPlan + 1];
        let dailyReadings = firstDailyReading + ";" + secondDailyReading;
        let dailyReadingsArray = dailyReadings
          .split(";")
          .map((reading) => reading.trim());

        let memoryDataForWeekDay = memorySourceData[currentWeekIndex];
        let newDay = {
          reading: dailyReadingsArray,
          memory: {
            passage: memoryDataForWeekDay ? memoryDataForWeekDay[1] : "",
            heading: memoryDataForWeekDay ? memoryDataForWeekDay[2] : "",
          },
        };

        currentWeek.days[dayInCurrentWeekIndex] = newDay;

        // Firestore data structure
        // weeks: [{
        //   days: [{
        //     reading: [],
        //     memory: {
        //        passage,
        //        heading
        //     },
        //   }]
        // }]
      }

      data.weeks = weeks;
      data.title = planTitle;
      data.id = `${year}.${p}`;
      data.description = planDescription;
      firestore.updateDocument(`readingPlans/${year}.${p}`, data);
    }
  });
}
