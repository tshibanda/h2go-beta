import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export type Locale = 'fr' | 'en'

export const pickLocale = (l?: string): Locale => (l === 'fr' ? 'fr' : 'en')

interface BrandLayoutProps {
  locale: Locale
  preview: string
  heading: string
  intro?: React.ReactNode
  body: React.ReactNode
  cta?: { label: string; href: string }
  footer?: React.ReactNode
  ctaHint?: React.ReactNode
}

export const BrandLayout = ({
  locale,
  preview,
  heading,
  intro,
  body,
  cta,
  footer,
  ctaHint,
}: BrandLayoutProps) => (
  <Html lang={locale} dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={hero}>
          <Text style={brandMark}>H2GO 💧</Text>
          <Heading as="h1" style={h1}>
            {heading}
          </Heading>
          {intro ? <Text style={lead}>{intro}</Text> : null}
        </Section>

        <Section style={card}>
          {typeof body === 'string' ? <Text style={text}>{body}</Text> : body}

          {cta ? (
            <Section style={ctaWrap}>
              <Button href={cta.href} style={ctaStyle}>
                {cta.label}
              </Button>
              {ctaHint ? <Text style={ctaHintStyle}>{ctaHint}</Text> : null}
            </Section>
          ) : null}
        </Section>

        {footer ? (
          <>
            <Hr style={hr} />
            <Text style={footerStyle}>{footer}</Text>
          </>
        ) : null}
      </Container>
    </Body>
  </Html>
)

// Brand tokens (mirror welcome.tsx): primary #3B82F6, secondary #14B8A6,
// surfaces #DBEAFE / #F8FAFC, ink #0F172A. Body must remain #ffffff.
export const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  color: '#0F172A',
  margin: 0,
  padding: 0,
}

export const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 20px 48px',
}

const hero: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 55%, #14B8A6 100%)',
  borderRadius: '24px',
  padding: '32px 28px',
  color: '#ffffff',
  textAlign: 'center',
}

const brandMark: React.CSSProperties = {
  fontFamily: "'Fredoka', 'Poppins', sans-serif",
  fontSize: '14px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  opacity: 0.85,
  margin: 0,
  color: '#ffffff',
}

const h1: React.CSSProperties = {
  fontFamily: "'Fredoka', 'Poppins', sans-serif",
  fontSize: '28px',
  fontWeight: 700,
  margin: '12px 0 8px',
  color: '#ffffff',
  lineHeight: 1.2,
}

const lead: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.55,
  margin: '8px 0 0',
  color: '#E0F2FE',
}

const card: React.CSSProperties = {
  backgroundColor: '#F8FAFC',
  border: '1px solid #DBEAFE',
  borderRadius: '20px',
  padding: '24px 22px',
  marginTop: '20px',
}

export const text: React.CSSProperties = {
  fontSize: '14px',
  color: '#1F2937',
  lineHeight: 1.6,
  margin: '0 0 16px',
}

export const link: React.CSSProperties = {
  color: '#3B82F6',
  textDecoration: 'underline',
}

const ctaWrap: React.CSSProperties = {
  textAlign: 'center',
  margin: '20px 0 4px',
}

const ctaStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'linear-gradient(90deg, #3B82F6 0%, #14B8A6 100%)',
  color: '#ffffff',
  fontFamily: "'Fredoka', 'Poppins', sans-serif",
  fontWeight: 600,
  fontSize: '15px',
  padding: '14px 28px',
  borderRadius: '16px',
  textDecoration: 'none',
}

const ctaHintStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#64748B',
  margin: '12px 0 0',
}

const hr: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #E2E8F0',
  margin: '32px 0 16px',
}

const footerStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: 1.5,
  color: '#94A3B8',
  textAlign: 'center',
  margin: 0,
}

export const codeStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  fontSize: '28px',
  fontWeight: 700,
  letterSpacing: '0.35em',
  color: '#0F172A',
  background: '#DBEAFE',
  borderRadius: '12px',
  padding: '16px 20px',
  textAlign: 'center' as const,
  margin: '0 0 16px',
}
