// How formatted text from the editor reads: an agent's presentation, a form's informative texts
export const richTextClasses = [
	"text-sm leading-relaxed break-words",
	"[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2:first-child]:mt-0",
	"[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-semibold [&_h3:first-child]:mt-0",
	"[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
	"[&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-5 [&_li]:my-0.5",
	"[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
	"[&_blockquote]:my-3 [&_blockquote]:border-s-2 [&_blockquote]:ps-3 [&_blockquote]:text-muted-foreground",
	"[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em]",
	"[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3",
	"[&_hr]:my-4 [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-lg",
].join(" ");
