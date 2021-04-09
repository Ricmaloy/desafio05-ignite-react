import { useState } from 'react';
import { GetStaticProps } from 'next';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';
import Link from 'next/link';
import { FaRegCalendar, FaRegUser } from 'react-icons/fa';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  // console.log(postsPagination);
  const { next_page, results } = postsPagination;
  const [nextPage, setNextPage] = useState(next_page);
  const [posts, setPosts] = useState(
    results.map(post => {
      return {
        uid: post.uid,
        first_publication_date: format(
          new Date(post.first_publication_date),
          'dd MMM yyyy',
          {
            locale: ptBR,
          }
        ),
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
        },
      };
    })
  );

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleLoadMorePosts = async function () {
    try {
      // faz a requisição ao prismic para novos posts
      const loadPostsFetchResult = await fetch(nextPage).then(res =>
        res.json()
      );

      const {
        next_page: fetchNext_page,
        results: fetchResults,
      } = loadPostsFetchResult;

      setNextPage(fetchNext_page);

      const newPosts = fetchResults.map(post => {
        return {
          uid: post.uid,
          first_publication_date: format(
            new Date(post.first_publication_date),
            'dd MMM yyyy',
            {
              locale: ptBR,
            }
          ),
          data: {
            title: post.data.title,
            subtitle: post.data.subtitle,
            author: post.data.author,
          },
        };
      });

      setPosts([...posts, ...newPosts]);
    } catch (error) {
      console.log(error);
    }
  };

  // TODO
  return (
    <>
      <Header />
      <div className={commonStyles.containerSizing}>
        {posts.map(post => (
          <div key={post.uid} className={styles.container}>
            <Link href={`/post/${post.uid}`}>
              <a>
                <h2 className={styles.title}>{post.data.title}</h2>
                <p className={styles.subtitle}>{post.data.subtitle}</p>
                <div className={styles.infos}>
                  <span>
                    <FaRegCalendar />
                    {post.first_publication_date}
                  </span>
                  <span>
                    <FaRegUser />
                    {post.data.author}
                  </span>
                </div>
              </a>
            </Link>
          </div>
        ))}
        {nextPage ? (
          <button
            type="button"
            className={styles.button}
            onClick={handleLoadMorePosts}
          >
            Carregar mais posts
          </button>
        ) : (
          ''
        )}
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      pageSize: 2,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const nextPage = `${postsResponse.next_page}`;

  return {
    props: {
      postsPagination: {
        next_page: nextPage,
        results: posts,
      },
    },
    revalidate: 10,
  };
};
