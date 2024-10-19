import path from 'path';
import en from 'payload/i18ni/en';
import richtextLexical from '@payloadcms/richtext-lexical'; // Import as default
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import buildConfig from 'payload/config.js';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const {
  AlignFeature,
  BlockquoteFeature,
  BlocksFeature,
  BoldFeature,
  ChecklistFeature,
  HeadingFeature,
  IndentFeature,
  InlineCodeFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  RelationshipFeature,
  UnorderedListFeature,
  UploadFeature,
} = richtextLexical;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const languages = [
  {
    name: 'German',
    lang: 'de',
    locale: 'de_CH',
    labels: {
      de: 'Deutsch',
      en: 'German',
      fr: 'Allemand',
      it: 'Tedesco',
    },
  },
  {
    name: 'English',
    lang: 'en',
    locale: 'en_US',
    labels: {
      de: 'Englisch',
      en: 'English',
      fr: 'Anglais',
      it: 'Inglese',
    },
  },
  {
    name: 'French',
    lang: 'fr',
    locale: 'fr_CH',
    labels: {
      de: 'Französisch',
      en: 'French',
      fr: 'Français',
      it: 'Francese',
    },
  },
  {
    name: 'Italian',
    lang: 'it',
    locale: 'it_CH',
    labels: {
      de: 'Italienisch',
      en: 'Italian',
      fr: 'Italien',
      it: 'Italiano',
    },
  },
];

export default buildConfig({
  editor: lexicalEditor(),
  collections: [
    {
      slug: 'users',
      auth: true,
      access: {
        delete: () => false,
        update: () => false,
      },
      fields: [],
    },
    {
      slug: 'pages',
      admin: {
        useAsTitle: 'title',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'content',
          type: 'richText',
        },
      ],
    },
    {
      slug: 'media',
      upload: true,
      fields: [
        {
          name: 'text',
          type: 'text',
        },
      ],
    },
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || '',
  }),
  i18n: {
    supportedLanguages: { en },
  },
  admin: {
    autoLogin: {
      email: 'dev@payloadcms.com',
      password: 'test',
      prefillOnly: true,
    },
  },
  async onInit(payload) {
    const existingUsers = await payload.find({
      collection: 'users',
      limit: 1,
    });

    if (existingUsers.docs.length === 0) {
      await payload.create({
        collection: 'users',
        data: {
          email: 'dev@payloadcms.com',
          password: 'test',
        },
      });
    }
  },
  sharp,
});
