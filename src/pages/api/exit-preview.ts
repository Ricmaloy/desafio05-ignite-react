import { Document } from '@prismicio/client/types/documents';
import { NextApiRequest, NextApiResponse } from 'next';

import { getPrismicClient } from '../../services/prismic';

function linkResolver(doc: Document): string {
  if (doc.type === 'posts') {
    return `/post/${doc.uid}`;
  }

  return '/';
}

export default async (
  request: NextApiRequest,
  response: NextApiResponse
): Promise<void> => {
  const { token: ref, documentId } = request.query;

  const prismic = getPrismicClient();

  const redirectUrl = await prismic
    .getPreviewResolver(String(ref), String(documentId))
    .resolve(linkResolver, '/');

  if (!redirectUrl) {
    response.status(401).json({ message: 'Invalid token' });
    return;
  }

  response.setPreviewData({ ref });
  response.writeHead(302, { Location: `${redirectUrl}` });
  response.end();
};
