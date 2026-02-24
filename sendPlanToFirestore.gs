function writeToFirestore() {
  const email = "sovereign-hope-mobile@appspot.gserviceaccount.com";
  const key =
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCUtzAK3W41bdYo\n7UjfZVyKezvS6ZoyL5HuvZEeW4fHFNfAb4/HkGfC/gqldvGHSSyNQtdaXSTrhSZ1\n1rbfG/8jwXe+L+XfDv9Jvv1PPOP6NvcWT55mgf4mqmnIS+/m0AWmM5VVPBs2qnfP\nkF/zZJg6dGLcseogPds2A7rNWMufEz65QtF+48bNmLZ/oAMu7JH9FrJV5Rtl+fFG\nV4GN5xJrbvRXUt5MSh9hWT0Jd46Myakx8+VR5vdIJ3Kw1Bb7YOmTy1/gANVXskmz\nnfwUgWdnfZGb1xeOFepYHzS1G0XPeC3IQyNiLUBXuod7uQq1r1d1XUgNmjtB9Uux\n3eD3UIGzAgMBAAECggEAQjzNcylpGvcO+i+l04qMC0oUPT665Tt23kUky8as1Skd\nZ6LJAXP6I0mPaF9v+HfJFin9TUxLU3N8y+OUlA8eNsjHEri2xAEkB66/mHlgeWPd\n7dwMi0++6W3hq8rW0ZE50usKymn5HQIUVyjQ89GMVAzes7mytCWY65gBrdCs8O6t\nlm8MQQuJABcrr+LlvUlckwq5Mq7RSyHlayIfkzTJ6P1DD4LTDCZJsxk5TWiw0LD3\nKXjECTEU/8obnL+0sIoOgLC+Q1usHILVpiWblAbYtTE73SPgbz9p+NgwZuQJXkrd\nVPau0y2d3RJymphk8Xv/ouxbp3dt7rSJZ0v2vz9m0QKBgQDH1ucuyU6ZHV5esg5U\nPiBwxB8TGN+/K3pGlk6+F9HZh5noKuTCKQbM7CvKGF1LD5h7Psjf2cNSjMeZBang\nON7bPWOakUbt0tSeCSkNo5u+0JHVyLsw4XIpRfoQNj0ena/IGdSoUtZKD68aivbb\nH+Khpej5vwR1SEv9HcpXsDQ51QKBgQC+gkRRjLu7Rs86AqiGKGznq173k4eCWAso\n2HxvbomTEPzzgVNxntKFpUPKsK1jqcyEa2O7uv4tAxY4tjQliHpzsjM6tBwC/EWK\n5F0Yu9fHG/bT0QGlpI4QUMMrWCcQz2o+kW/5NeykNFyazJByHcxrcvtuUckQ+ece\nKzVsctHJZwKBgQC89B8tptxxfEpxwWw5DXFBDr/PH9LYAHUibxbPONiMFWJaGsyo\nJYCvnJOfCECWK43i4q+usUm1MTW9I5THVR6rMDWQvdLSJmoxb7noko099BogiScu\nBc0a53aVg6Nw4mqGCp5/9at25bOMpl7ZPCHe9HAATTQa7Rwkndln5kzLbQKBgE53\n9Y/pecHvrpdkVOm9aO4bhihPmfc0MJSIZui3DO+Ihcf+stIP6wKlScEI+MIeRGEe\nopvGr772kIaXde8nwdg5xCQf35HTOwm0eiwf4wbeG9KvOhByMRnDSkBmNOEVrdtL\nqGVrsqcH8kTIkY6Pe42edLXB9iGJ7YpdncmnmYVtAoGBAKsFpn8YCP76FDoNDgWZ\ngtFJA91+ELYYMF2XNkOuhvFwq1NCJNUlWqcnEQ9CTyJHo96hag6NLTaXgR2+9s45\nMoRCOjD+/57U5zclFQ7vif+oKTyWmMa5/qsdsDH66uw3XuXb7LkLOxUlLQoBqRXG\nSVybn0YDnmflrk3Wk+W3TD9X\n-----END PRIVATE KEY-----\n";
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
