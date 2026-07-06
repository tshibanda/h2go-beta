import * as React from 'react'
import { Text } from '@react-email/components'
import { BrandLayout, codeStyle, pickLocale, text, type Locale } from './_brand'

interface ReauthenticationEmailProps {
  token: string
  locale?: Locale
}

const COPY: Record<Locale, {
  preview: string
  heading: string
  intro: string
  footer: string
}> = {
  en: {
    preview: 'Your verification code',
    heading: 'Confirm reauthentication 💧',
    intro: 'Use the code below to confirm your identity:',
    footer:
      "This code will expire shortly. If you didn't request this, you can safely ignore this email.",
  },
  fr: {
    preview: 'Votre code de vérification',
    heading: 'Confirmez votre authentification 💧',
    intro: 'Utilisez le code ci-dessous pour confirmer votre identité :',
    footer:
      "Ce code expire rapidement. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
  },
}

export const ReauthenticationEmail = ({ token, locale }: ReauthenticationEmailProps) => {
  const l = pickLocale(locale)
  const c = COPY[l]
  return (
    <BrandLayout
      locale={l}
      preview={c.preview}
      heading={c.heading}
      body={
        <>
          <Text style={text}>{c.intro}</Text>
          <Text style={codeStyle}>{token}</Text>
        </>
      }
      footer={c.footer}
    />
  )
}

export default ReauthenticationEmail
