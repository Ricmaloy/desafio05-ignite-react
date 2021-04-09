import { GetStaticPaths, GetStaticProps } from 'next';
import { FaCalendarAlt, FaRegUser, FaClock } from 'react-icons/fa';

import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { RichText } from 'prismic-dom';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
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

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  const { first_publication_date, data } = post;

  const formatedDate = format(new Date(first_publication_date), 'dd MMM yyyy', {
    locale: ptBR,
  });

  const timeReading = data.content.reduce((sum, content) => {
    const words = RichText.asText(content.body).split(' ').length;
    return Math.ceil(sum + words / 200);
  }, 0);

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

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
            ;
          </div>
        ))}
      </main>
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

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
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
    },
    revalidate: 60 * 30,
  };
};
