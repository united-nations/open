import { SecretariatSubnav } from "@/components/SecretariatSubnav";

export default function SecretariatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SecretariatSubnav />
      {children}
    </>
  );
}
