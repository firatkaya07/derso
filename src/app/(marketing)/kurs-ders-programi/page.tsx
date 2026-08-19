import SeoMarketingPage, {
  buildSeoMetadata,
} from "@/components/landing/SeoMarketingPage";
import { getSeoPage } from "@/lib/seo-pages";
import { notFound } from "next/navigation";

const PATH = "/kurs-ders-programi";
const page = getSeoPage(PATH);

export function generateMetadata() {
  if (!page) return {};
  return buildSeoMetadata(page);
}

export default function Page() {
  if (!page) notFound();
  return <SeoMarketingPage page={page} />;
}
