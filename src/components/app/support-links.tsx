import { Link } from "@tanstack/react-router";
import { Globe, Heart, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const DONATE_URL = "https://www.paypal.com/donate/?hosted_button_id=XM6K2Y4MXJZC4";
export const FEEDBACK_URL = "https://forms.gle/Re5mt8RXU7qNEN8W9";

export function SupportButtons() {
  return (
    <>
      <Button variant="outline" size="sm" asChild>
        <Link to="/browser">
          <Globe className="size-3.5" />
          Browser
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={DONATE_URL} target="_blank" rel="noreferrer">
          <Heart className="size-3.5" />
          Donate
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={FEEDBACK_URL} target="_blank" rel="noreferrer">
          <MessageSquarePlus className="size-3.5" />
          Feedback
        </a>
      </Button>
    </>
  );
}
