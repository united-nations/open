import {
  SiteFooter as UiSiteFooter,
  type FooterLabels,
} from "@un-eosg/ui/components/site-footer";

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
      containerClassName="max-w-6xl px-6 md:px-12 lg:px-16"
    />
  );
}
