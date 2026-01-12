import { Link } from "expo-router";
import type { Href } from "expo-router";
import type React from "react";
import type { ElementType } from "react";
import { Pressable, type PressableProps, Text, View, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";

import { Muted } from "./typography";

import { ChevronRight } from "@/components/Icons";
import { cn } from "@/lib/utils";

const listItemTextVariants = cva(
	"text-base font-normal", // base styles
	{
		variants: {
			variant: {
				default: "text-text",
				primary: "text-lavender",
				link: "text-blue-500",
				destructive: "text-red",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

interface ItemProps {
	className: string;
}

// Define props for ListItem with TypeScript interface
type ListItemProps = VariantProps<typeof listItemTextVariants> & {
	label: string;
	description?: string;
	itemLeft?: (itemProps: ItemProps) => React.ReactElement;
	itemRight?: (itemProps: ItemProps) => React.ReactElement;
	onPress?: () => void;
	/**
	 * If true, a detail arrow will appear on the item.
	 */
	detail?: boolean;
	/**
	 * Convert the default Pressable with a Link component.
	 */
	href?: Href;
	className?: string;
} & (ViewProps | PressableProps);

// ListItem component
const ListItem: React.FC<ListItemProps> = ({
	label,
	description,
	itemLeft,
	itemRight,
	detail = true,
	variant,
	className,
	href,
	...props
}) => {
	// Automatically add ChevronRight if onPress is defined and detail is true
	const ItemRight = () => {
		if (itemRight) {
			return itemRight({
				className: cn("size-5 opacity-70", listItemTextVariants({ variant })),
			});
		} else if ((props?.onPress && detail) || (href && detail)) {
			return (
				<ChevronRight
					className={cn("size-5 opacity-70", listItemTextVariants({ variant }))}
				/>
			);
		}
		return null;
	};
	const pressable = props?.onPress || href;
	const Component = (pressable ? Pressable : View) as ElementType<
		ViewProps | PressableProps
	>;

	const body = (
		<Component
			className={cn(
				"flex-row items-center justify-between w-full px-4 py-3 border-b border-surface1 bg-surface0",
				pressable ? "web:hover:opacity-90 active:opacity-90" : "",
				listItemTextVariants({ variant }),
				className,
			)}
			accessibilityRole={pressable ? "button" : "none"}
			accessibilityLabel={`${label}${description ? `, ${description}` : ""}`}
			{...props}
		>
			{itemLeft && (
				<View className="mr-3">
					{itemLeft({
						className: cn(
							"text-text",
							listItemTextVariants({ variant }),
						),
					})}
				</View>
			)}
			<View className="flex-1">
				<Text className={cn(listItemTextVariants({ variant }))}>{label}</Text>
				{description && <Muted>{description}</Muted>}
			</View>
			<ItemRight />
		</Component>
	);
	if (href) {
		return (
			<Link href={href} asChild>
				{body}
			</Link>
		);
	} else {
		return body;
	}
};

export default ListItem;
