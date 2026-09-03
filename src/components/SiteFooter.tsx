import {
  SiteFooter as UiSiteFooter,
  type FooterLabels,
} from "@un-eosg/ui/components/site-footer";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const LABELS: FooterLabels = {
  home: "United Nations",
  donate: "Donate",
  newTab: "opens in new tab",
  links: {
    siteIndex: "A-Z Site Index",
    contact: "Contact",
    copyright: "Copyright",
    faq: "FAQ",
    fraudAlert: "Fraud Alert",
    privacyNotice: "Privacy Notice",
    termsOfUse: "Terms of Use",
  },
};

export function SiteFooter() {
  return (
    <UiSiteFooter
      locale="en"
      labels={LABELS}
      logoBasePath={`${basePath}/images`}
      containerClassName="max-w-6xl px-6 md:px-12 lg:px-16"
    />
  );
}
