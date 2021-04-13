import { GetStaticPaths, GetStaticProps } from 'next';
import { FaCalendarAlt, FaRegUser, FaClock } from 'react-icons/fa';

import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { RichText } from 'prismic-dom';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import { UtterancesComments } from '../../components/UtterancesComments';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
        type: string;
      }[];
    }[];
  };
}

interface linkPost {
  uid: string;
  data: {
    title: string;
  };
}

interface PostProps {
  post: Post;
  prevPost?: linkPost;
  nextPost?: linkPost;
  preview: boolean;
}

export default function Post({
  post,
  prevPost,
  nextPost,
  preview,
}: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const { first_publication_date, last_publication_date, data } = post;

  const formatedDate = format(new Date(first_publication_date), 'dd MMM yyyy', {
    locale: ptBR,
  });

  const lastChangeDate = format(
    new Date(post.first_publication_date),
    "'* editado em' dd MMM yyyy', às' H':'m",
    {
      locale: ptBR,
    }
  );

  const timeReading = data.content.reduce((sum, content) => {
    const words = RichText.asText(content.body).split(' ').length;
    return Math.ceil(sum + words / 200);
  }, 0);

  return (
    <>
      <Head>
        <title>Spacetraveling | {post.data.title}</title>
      </Head>

      <Header />
      <img className={styles.banner} src={data.banner.url} alt={data.title} />
      <main className={commonStyles.containerSizing}>
        <div className={styles.header}>
          <p className={styles.headerTitle}>{data.title}</p>
          <div className={styles.headerInfos}>
            <span>
              <FaCalendarAlt />
              {formatedDate}
            </span>
            <span>
              <FaRegUser />
              {data.author}
            </span>
            <span>
              <FaClock />
              {timeReading} min
            </span>
          </div>
          {last_publication_date !== first_publication_date && (
            <p className={styles.lastChanged}> {lastChangeDate} </p>
          )}
        </div>
        {data.content.map(content => (
          <div key={content.heading} className={styles.content}>
            <h1>{content.heading}</h1>
            {content.body.map((body, index) => {
              const key = index;
              return body.type === 'list-item' ? (
                <ul key={key}>
                  <li>{body.text}</li>
                </ul>
              ) : (
                <p key={key}>{body.text}</p>
              );
            })}
          </div>
        ))}
      </main>
      <footer className={styles.footer}>
        <div className={styles.divider} />
        <div className={styles.morePosts}>
          {prevPost && (
            <a
              href={`/post/${prevPost.uid}`}
              className={styles.morePosts_previous}
            >
              <p>{prevPost.data.title}</p>
              <span>Post anterior</span>
            </a>
          )}
          {nextPost && (
            <a href={`/post/${nextPost.uid}`} className={styles.morePosts_next}>
              <p>{nextPost.data.title}</p>
              <span>Próximo Post</span>
            </a>
          )}
        </div>
        <UtterancesComments />
        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </footer>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
    }
  );

  const slugs = postsResponse.results.map(slug => slug.uid);

  return {
    paths: slugs.map(slug => {
      return {
        params: { slug },
      };
    }),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const prevResponse = await prismic.query(
    Prismic.predicates.at('document.type', 'post'),
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const nextResponse = await prismic.query(
    Prismic.predicates.at('document.type', 'post'),
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const nextPost = nextResponse.results[0] || null;
  const prevPost = prevResponse.results[0] || null;

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: content.body.map(body => {
            return {
              text: body.text,
              type: body.type,
              spans: [...body.spans],
            };
          }),
        };
      }),
    },
  };

  return {
    props: {
      post,
      prevPost,
      nextPost,
      preview,
    },
    revalidate: 60 * 30,
  };
};
