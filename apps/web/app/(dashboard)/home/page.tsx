/**
 * @file page.tsx
 * @description Landing/home dashboard after sign-in, rendering the activity dashboard.
 * @architecture Renders the Dashboard component which internally fetches home feed data.
 */
import { Dashboard } from "@/components/dashboard";

/**
 * @desc    Render the user dashboard
 * @returns {JSX.Element} The Dashboard component
 */
export default function Home() {
  return <Dashboard />;
}
