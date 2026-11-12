import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const c = {
  cream: "#FAF6EF",
  sand: "#F2EADD",
  line: "#E3D6C2",
  espresso: "#2E231C",
  soft: "#5A4A3F",
  terracotta: "#A5603F",
};

export function EmailLayout({ preview, title, children }: { preview: string; title: string; children: ReactNode }) {
  return (
    <Html lang="bg">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: c.sand, margin: 0, padding: "24px 0", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, backgroundColor: c.cream, borderRadius: 6, overflow: "hidden" }}>
          <Section style={{ backgroundColor: c.espresso, padding: "22px 0", textAlign: "center" }}>
            <Text style={{ fontFamily: "Georgia, serif", fontSize: 30, lineHeight: "34px", letterSpacing: "0.08em", color: c.cream, margin: 0 }}>
              CULTE
            </Text>
          </Section>
          <Section style={{ padding: "32px 32px 8px" }}>
            <Heading
              as="h1"
              style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 28, lineHeight: "34px", color: c.espresso, margin: 0 }}
            >
              {title}
            </Heading>
          </Section>
          <Section style={{ padding: "0 32px 24px" }}>{children}</Section>
          <Hr style={{ borderColor: c.line, margin: 0 }} />
          <Section style={{ padding: "20px 32px 28px" }}>
            <Text style={{ fontSize: 13, lineHeight: "20px", color: c.soft, margin: 0 }}>
              Culte · гр. Пловдив, ж.к. Оазис 3 / ул. Димитър Талев 144 · 0878 817 088
              <br />
              <Link href={site} style={{ color: c.terracotta }}>
                {site.replace(/^https?:\/\//, "")}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 15, lineHeight: "24px", color: c.espresso, margin: "16px 0 0" }}>{children}</Text>;
}

export function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: 20, borderCollapse: "collapse" }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={{ padding: "8px 12px 8px 0", fontSize: 14, color: c.soft, verticalAlign: "top", width: "40%", borderBottom: `1px solid ${c.line}` }}>
              {k}
            </td>
            <td style={{ padding: "8px 0", fontSize: 14, color: c.espresso, verticalAlign: "top", borderBottom: `1px solid ${c.line}` }}>
              {v}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Items({ items }: { items: { name: string; qty?: number; price: string }[] }) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: 20, borderCollapse: "collapse" }}>
      <tbody>
        {items.map((i, idx) => (
          <tr key={idx}>
            <td style={{ padding: "8px 12px 8px 0", fontSize: 14, color: c.espresso, borderBottom: `1px solid ${c.line}` }}>
              {i.name}
              {i.qty ? ` × ${i.qty}` : ""}
            </td>
            <td style={{ padding: "8px 0", fontSize: 14, color: c.espresso, textAlign: "right", whiteSpace: "nowrap", borderBottom: `1px solid ${c.line}` }}>
              {i.price}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CTA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ marginTop: 24 }}>
      <Link
        href={href}
        style={{ backgroundColor: c.terracotta, color: c.cream, padding: "12px 20px", borderRadius: 6, fontSize: 15, textDecoration: "none", display: "inline-block" }}
      >
        {children}
      </Link>
    </Section>
  );
}

export { site as emailSite };
