// An imported SVG is its address: the build writes the image itself in its place
declare module "*.svg" {
	const address: string;

	export default address;
}
