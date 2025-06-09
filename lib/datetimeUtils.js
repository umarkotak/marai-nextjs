export function FormatDateConcrete(dateTimeString) {
    const date = new Date(dateTimeString);

    // Use UTC methods if timezone is important
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}/${month}/${day}`;
}

export function FormatMillisecondsToMMSSSSS(milliseconds) {
  // Ensure the input is a non-negative number
  if (typeof milliseconds !== 'number' || milliseconds < 0) {
    console.error("Input must be a non-negative number.");
    return "Invalid Duration";
  }

  // Calculate total seconds (including fractional part)
  const totalSeconds = milliseconds / 1000;

  // Calculate minutes
  const minutes = Math.floor(totalSeconds / 60);
  const formattedMinutes = String(minutes).padStart(2, '0');

  // Calculate remaining seconds (integer part)
  const seconds = Math.floor(totalSeconds % 60);
  const formattedSeconds = String(seconds).padStart(2, '0');

  // Calculate milliseconds (the fractional part)
  const remainingMilliseconds = Math.floor((totalSeconds % 1) * 1000);
  const formattedMilliseconds = String(remainingMilliseconds).padStart(3, '0');

  return `${formattedMinutes}:${formattedSeconds}.${formattedMilliseconds}`;
}

function FormatMMSSSSSToMilliseconds(formattedDuration) {
  // Regular expression to validate the format and capture parts
  const regex = /^(\d{2}):(\d{2})\.(\d{3})$/;
  const match = formattedDuration.match(regex);

  if (!match) {
    console.error("Input string must be in 'MM:SS.SSS' format.");
    return "Invalid Format";
  }

  // Extract parts and convert to numbers
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const milliseconds = parseInt(match[3], 10);

  // Validate the parsed values (e.g., seconds not exceeding 59, milliseconds not exceeding 999)
  if (seconds >= 60 || milliseconds >= 1000) {
    console.error("Invalid time values in 'MM:SS.SSS' format (e.g., seconds >= 60 or milliseconds >= 1000).");
    return "Invalid Format";
  }

  // Calculate total milliseconds
  const totalMilliseconds =
    (minutes * 60 * 1000) +
    (seconds * 1000) +
    milliseconds;

  return totalMilliseconds;
}
