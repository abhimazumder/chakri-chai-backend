const experienceOptions = [
  [
    {
      VALUE: "Select a option",
      ID: "Select a option",
      DISABLED: true,
    },
    {
      VALUE: "< 1 Year",
      ID: "LessThan1Year",
      DISABLED: false,
      minYears: 0,
      maxYears: 1,
    },
    {
      VALUE: "1 - 3 Years",
      ID: "1to3Years",
      DISABLED: false,
      minYears: 1,
      maxYears: 3,
    },
    {
      VALUE: "3 - 5 Years",
      ID: "3to5Years",
      DISABLED: false,
      minYears: 3,
      maxYears: 5,
    },
    {
      VALUE: "5 - 7 Years",
      ID: "5to7Years",
      DISABLED: false,
      minYears: 5,
      maxYears: 7,
    },
    {
      VALUE: "7 - 10 Years",
      ID: "7to10Years",
      DISABLED: false,
      minYears: 7,
      maxYears: 10,
    },
    {
      VALUE: "> 10 Years",
      ID: "MoreThan10Years",
      DISABLED: false,
      minYears: 10,
      maxYears: Infinity,
    },
  ],
];

function getExperienceRange(label) {
  const option = experienceOptions.find(
    (opt) => opt.label.toLowerCase() === label.toLowerCase()
  );
  return option
    ? { minYears: option.minYears, maxYears: option.maxYears }
    : null;
}

function filterByExperience(Items, selectedOption) {
  const { minYears, maxYears } = getExperienceRange(selectedOption) || {};

  if (!minYears || !maxYears) {
    return [];
  }

  return Items.filter((item) => {
    const { RANGE, UNIT } = item.REQUIRED_EXPERIENCE;
    const yearsConversion = { Year: 1, Month: 1 / 12, Week: 1 / 52 };

    const absoluteYears = RANGE["ABSOLUTE"]
      ? RANGE["ABSOLUTE"] * yearsConversion[UNIT]
      : null;
    const minYearsFromRange = RANGE["MINIMUM"]
      ? RANGE["MINIMUM"] * yearsConversion[UNIT]
      : null;
    const maxYearsFromRange = RANGE["MAXIMUM"]
      ? RANGE["MAXIMUM"] * yearsConversion[UNIT]
      : null;

    if (absoluteYears !== null) {
      return absoluteYears >= minYears && absoluteYears <= maxYears;
    }

    if (minYearsFromRange !== null && maxYearsFromRange !== null) {
      return minYearsFromRange <= maxYears && maxYearsFromRange >= minYears;
    }

    if (maxYearsFromRange !== null) {
      return maxYearsFromRange >= minYears;
    }

    if (minYearsFromRange !== null) {
      return minYearsFromRange <= maxYears;
    }

    return false;
  });
}

module.exports = { filterByExperience };
