import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

type Locale = 'fr' | 'en'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  locale?: Locale
}

const COPY: Record<Locale, {
  preview: (site: string) => string
  heading: string
  intro: (site: string, url: string) => React.ReactNode
  verify: (email: string) => React.ReactNode
  cta: string
  footer: string
}> = {
  en: {
    preview: (site) => `Confirm your email for ${site}`,
    heading: 'Confirm your email',
    intro: (site, url) => (
      <>
        Thanks for signing up for{' '}
        <Link href={url} style={link}>
          <strong>{site}</strong>
        </Link>
        !
      </>
    ),
    verify: (email) => (
      <>
        Please confirm your email address (
        <Link href={`mailto:${email}`} style={link}>
          {email}
        </Link>
        ) by clicking the button below:
      </>
    ),
    cta: 'Verify Email',
    footer: "If you didn't create an account, you can safely ignore this email.",
  },
  fr: {
    preview: (site) => `Confirmez votre e-mail pour ${site}`,
    heading: 'Confirmez votre e-mail',
    intro: (site, url) => (
      <>
        Merci de votre inscription à{' '}
        <Link href={url} style={link}>
          <strong>{site}</strong>
        </Link>
        !
      </>
    ),
    verify: (email) => (
      <>
        Merci de confirmer votre adresse e-mail (
        <Link href={`mailto:${email}`} style={link}>
          {email}
        </Link>
        ) en cliquant sur le bouton ci-dessous :
      </>
    ),
    cta: "Confirmer l'e-mail",
    footer:
      "Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e-mail.",
  },
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  locale,
}: SignupEmailProps) => {
  const l: Locale = locale === 'fr' ? 'fr' : 'en'
  const c = COPY[l]
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{c.preview(siteName)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{c.heading}</Heading>
          <Text style={text}>{c.intro(siteName, siteUrl)}</Text>
          <Text style={text}>{c.verify(recipient)}</Text>
          <Button style={button} href={confirmationUrl}>
            {c.cta}
          </Button>
          <Text style={footer}>{c.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0F172A',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: '#3B82F6', textDecoration: 'underline' }
const button = {
  backgroundColor: '#3B82F6',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
