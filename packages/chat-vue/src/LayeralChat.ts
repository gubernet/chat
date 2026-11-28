import "@layeral/chat-element";
import type {
	ChatColor,
	ChatHistoryPlacement,
	ChatTheme,
	ConversationChangeEvent,
	GetToken,
	LayeralChatElement,
	Notify,
} from "@layeral/chat-element";
import {
	defineComponent,
	h,
	onMounted,
	type PropType,
	shallowRef,
	type SlotsType,
	Teleport,
	type VNode,
} from "vue";

/**
 * The whole chat of an agent of a Layeral installation, as `<layeral-chat>`
 * draws it. `v-model:conversation-id` keeps the conversation the chat is on;
 * the `bar-end` slot goes at the end of the bar on top.
 */
export const LayeralChat = defineComponent({
	name: "LayeralChat",
	props: {
		// The address of the Layeral installation, as https://app.example.com
		url: { type: String, required: true },
		agentId: { type: String, required: true },
		// The conversation to open, null for a new chat
		conversationId: { type: String as PropType<string | null>, default: undefined },
		history: { type: String as PropType<ChatHistoryPlacement>, default: undefined },
		// A language tag, as "it" or "it-IT"; without it, the browser's language
		locale: { type: String, default: undefined },
		theme: { type: String as PropType<ChatTheme>, default: undefined },
		color: { type: String as PropType<ChatColor>, default: undefined },
		hideTitle: Boolean,
		hideModel: Boolean,
		hideEffort: Boolean,
		// On a site other than the installation's: the user's token in the app
		getToken: { type: Function as PropType<GetToken>, default: undefined },
		// Shows the chat's notices with the app's own toasts, in place of the chat's
		notify: { type: Function as PropType<Notify>, default: undefined },
	},
	emits: {
		"update:conversationId": (conversationId: string | null) =>
			conversationId === null || typeof conversationId === "string",
	},
	slots: Object as SlotsType<{ "bar-end"?: () => VNode[] }>,
	setup(props, { emit, slots }) {
		const element = shallowRef<LayeralChatElement | null>(null);
		// Known once the element is in the page
		const barEnd = shallowRef<HTMLElement | null>(null);

		onMounted(() => {
			barEnd.value = element.value?.barEndContainer ?? null;
		});

		return () => {
			const barEndSlot = slots["bar-end"];

			return h(
				"layeral-chat",
				{
					ref: element,
					// Properties of the element, not attributes: functions included
					".url": props.url,
					".agentId": props.agentId,
					".conversationId": props.conversationId,
					".history": props.history,
					".locale": props.locale,
					".theme": props.theme,
					".color": props.color,
					".hideTitle": props.hideTitle,
					".hideModel": props.hideModel,
					".hideEffort": props.hideEffort,
					".getToken": props.getToken,
					".notify": props.notify,
					onConversationChange: (event: ConversationChangeEvent) =>
						emit("update:conversationId", event.detail.conversationId),
				},
				barEnd.value && barEndSlot ? [h(Teleport, { to: barEnd.value }, barEndSlot())] : [],
			);
		};
	},
});
