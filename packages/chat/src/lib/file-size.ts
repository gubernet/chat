// A file's size as the chat writes it, in kilobytes: format.number(size / 1024, FILE_SIZE_FORMAT)
export const FILE_SIZE_FORMAT = {
	style: "unit",
	unit: "kilobyte",
	maximumFractionDigits: 1,
} as const;
