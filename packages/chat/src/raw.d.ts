// A file imported with "?raw" is its text: the build writes it in its place
declare module "*?raw" {
	const text: string;

	export default text;
}
