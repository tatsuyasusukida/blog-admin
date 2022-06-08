const winston = require('winston')
const model = require('../model')
const {LoggerMaker} = require('../util/LoggerMaker')
const pug = require('pug')
const {Storage} = require('@google-cloud/storage')

class Main {
  async run () {
    const loggerMaker = new LoggerMaker()

    winston.loggers.add('query', loggerMaker.makeLogger('info', 'raw', 'fixture-query.log'))

    try {
      await model.sequelize.sync({force: true})

      await model.publicFile.create({
        code: 'document/document-1-sample.pdf',
        title: 'ここに公開ファイルのタイトルが入ります',
        description: '\nここに公開ファイルの説明が入ります。'.repeat(3).slice(1),
        location: `gs://${process.env.BUCKET_PUBLIC}/document/document-1-sample.pdf`,
      })

      await model.privateFile.create({
        code: 'document/document-1.pdf',
        title: 'ここに公開ファイルのタイトルが入ります',
        description: '\nここに公開ファイルの説明が入ります。'.repeat(3).slice(1),
        location: `gs://${process.env.BUCKET_PRIVATE}/document/document-1.pdf`,
      })

      await model.description.create({
        subject: `http://localhost:3000/`,
        predicate: 'http://purl.org/dc/elements/1.1/title',
        object: 'ここにサイト名が入ります',
      })

      await model.description.create({
        subject: `http://localhost:3000/`,
        predicate: 'http://purl.org/dc/elements/1.1/description',
        object: 'ここにサイトの説明が入ります',
      })

      await model.description.create({
        subject: `http://localhost:3000/`,
        predicate: 'https://ogp.me/ns#image',
        object: 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg',
      })

      await model.user.create({
        email: process.env.USER_EMAIL,
      })

      const email = await model.email.create({
        date: new Date('2021-12-30T00:00:00Z'),
        fromName: 'ここに差出人が入ります',
        fromEmail: 'from@loremipsum.co.jp',
        toName: 'ここに宛先が入ります',
        toEmail: 'to@loremipsum.co.jp',
        subject: 'ここに件名が入ります',
        content: 'ここに本文が入ります' + '\nここに本文が入ります'.repeat(2),
        isSent: false,
        errorCount: 1,
        errorMessage: 'ここにエラーメッセージが入ります',
        errorStack: 'ここにスタックトレースが入ります' + '\nここにスタックトレースが入ります'.repeat(2),
      })

      const author = await model.author.create({
        code: 'susukida',
        name: '薄田 達哉',
        kana: 'ススキダタツヤ',
        roman: 'Tatsuya Susukida',
        url: 'https://www.loremipsum.co.jp/',
        visual: 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg',
        profile: 'ここに自己紹介が入ります。'.repeat(5),
      })

      const document = await model.document.create({
        code: 'document-1',
        title: 'ここにダウンロード資料のタイトルが入ります1',
        titleShort: 'ダウンロード資料1',
        visual: 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg',
        date: '2021-12-01',
        description: 'ここに導入テキストが入ります。'.repeat(5),
        file: `gs://${process.env.BUCKET_PRIVATE}/document-1.pdf`,
        sample: new Storage().bucket(process.env.BUCKET_PUBLIC).file('document-1/sample.pdf').publicUrl(),
        page: '50',
        isPublished: true,
      })

      const request = await model.request.create({
        date: new Date('2021-12-29T00:00:00Z'),
        name: 'ここに氏名が入ります',
        email: 'ここにメールアドレスが入ります',
        subscribe: '希望する',
        code: 'code',
      })

      const unsubscribe = await model.unsubscribe.create({
        date: new Date('2021-12-29T00:00:00Z'),
        email: 'ここにメールアドレスが入ります',
      })

      await model.requestDocument.create({
        requestId: request.id,
        documentId: document.id,
      })

      for (let i = 1; i <= 3; i += 1) {
        const documentSection = await model.documentSection.create({
          sort: i,
          title: `ここに見出しが入ります${i}`,
          documentId: document.id,
        })

        for (let j = 1; j <= 3; j += 1) {
          await model.documentSubsection.create({
            sort: j,
            title: `ここに小見出しが入ります${j}`,
            documentSectionId: documentSection.id,
          })
        }
      }

      const categoryTutorial = await model.category.create({
        sort: 1,
        code: 'tutorial',
        title: 'チュートリアル',
      })

      const categoryWork = await model.category.create({
        sort: 2,
        code: 'work',
        title: '開発事例',
      })

      const categories = [categoryTutorial, categoryWork]

      for (const category of categories) {
        const i = categories.indexOf(category) + 1

        for (let j = 1; j <= 3; j += 1) {
          const serial = await model.serial.create({
            code: `${category.code}-serial-${j}`,
            title: `ここに${category.title}シリーズ${j}のタイトルが入ります`,
            titleShort: `${category.title}${j}`,
            visual: 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg',
            isPublished: true,
          })

          await model.categorySerial.create({
            sort: j,
            categoryId: category.id,
            serialId: serial.id,
          })

          const articles = []

          for (let k = 1; k <= 3; k += 1) {
            const article = await model.article.create({
              code: `${category.code}-serial-${j}-article-${k}`,
              title: `ここに${category.title}シリーズ${j}の記事${k}のタイトルが入ります`,
              titleShort: `${category.title}${j}の記事${k}`,
              visual: 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg',
              date: '2021-12-0' + k,
              description: 'ここに導入テキストが入ります。'.repeat(5),
              body: this.getArticleBody(),
              minute: '10',
              isPublished: true,
            })

            await model.serialArticle.create({
              sort: k,
              serialId: serial.id,
              articleId: article.id,
            })

            await model.articleDocument.create({
              articleId: article.id,
              documentId: document.id,
            })

            await this.createArticleSections(article)

            await model.authorArticle.create({
              authorId: author.id,
              articleId: article.id,
            })

            if (i === 1) {
              await model.documentArticle.create({
                sort: 3 * 3 * (i - 1) + 3 * (j - 1) + k,
                documentId: document.id,
                articleId: article.id,
              })
            }

            articles.push(article)
          }

          for (const articleFrom of articles) {
            for (const articleTo of articles) {
              if (articleFrom.id != articleTo.id) {
                await model.articleArticle.create({
                  sort: articles.indexOf(articleTo) + 1,
                  articleFromId: articleFrom.id,
                  articleToId: articleTo.id,
                })
              }
            }
          }
        }
      }

      const topics = []

      for (let i = 1; i <= 8; i += 1) {
        const topic = await model.topic.create({
          sort: i,
          code: `topic-${i}`,
          title: `トピック${i}`,
        })

        topics.push(topic)
      }

      const articles = []

      for (let i = 1; i <= 9; i += 1) {
        const article = await model.article.create({
          code: `column-article-${i}`,
          title: `ここにコラム記事${i}のタイトルが入ります`,
          titleShort: `コラム記事${i}`,
          visual: 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg',
          date: '2021-12-0' + i,
          description: 'ここに導入テキストが入ります。'.repeat(5),
          body: this.getArticleBody(),
          minute: '10',
          isPublished: true,
        })

        for (let j = 0; j < 3; j += 1) {
          const topic = topics[(i + j - 1) % topics.length]

          await model.topicArticle.create({
            sort: j + 1,
            topicId: topic.id,
            articleId: article.id,
          })
        }

        await model.articleDocument.create({
          articleId: article.id,
          documentId: document.id,
        })

        await this.createArticleSections(article)

        await model.authorArticle.create({
          authorId: author.id,
          articleId: article.id,
        })

        articles.push(article)
      }

      for (let i = 0; i < articles.length; i += 1) {
        for (let j = 1; j <= 3; j += 1) {
          const articleFrom = articles[i]
          const articleTo = articles[(i + j) % articles.length]

          await model.articleArticle.create({
            sort: j,
            articleFromId: articleFrom.id,
            articleToId: articleTo.id,
          })
        }
      }

      await model.emailTemplate.create({
        sort: 1,
        code: 'document-request',
        title: 'ダウンロード資料のお申し込み完了',
        fromName: 'ここにサイト名が入ります',
        fromEmail: 'blog@loremipsum.co.jp',
        toName: '{{{request.name}}} 様',
        toEmail: '{{{request.email}}}',
        subject: 'ダウンロードURLのお知らせ｜{{{document.title}}}',
        content: [
          "{{{request.name}}} 様",
          "",
          "株式会社ロレムイプサムの薄田達哉と申します。",
          "この度は技術ブログよりお問い合わせをいただきまして誠にありがとうございます。",
          "",
          "お申し込みいただいた資料のダウンロードURLを下記の通りお知らせいたします。",
          "なお、ダウンロードURLの有効期間は発行から24時間です。",
          "",
          "- 資料名: {{{document.title}}}",
          "- ダウンロードURL: {{{urlDownload}}}",
          "",
          "メールマガジンの配信（無料）については「{{{request.subscribe}}}」にて承りました。",
          "{{#isSubscribed}}配信停止をご希望の場合、下記URLよりお手続きください。",
          "",
          "- URL: {{{urlUnsubscribe}}}",
          "{{/isSubscribed}}",
          "",
          "Webシステム開発でお手伝いできることがありましたら、",
          "本メール返信やお問い合わせフォームなどからお気軽にお問い合わせください。",
          "",
          "-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-",
          "　株式会社ロレムイプサム",
          "　代表取締役　　薄田　達哉",
          "",
          "　〒940-2039",
          "　新潟県長岡市関原南4丁目3934番地",
          "　Tel：0258-94-5233　　Fax：0258-94-5541",
          "　E-mail：susukida@loremipsum.co.jp",
          "　Web：https://www.loremipsum.co.jp/",
          "-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-",
          "",
        ].join('\n'),
      })
    } finally {
      model.sequelize.close()
    }
  }

  getArticleBody () {
    return pug.render([
      `section`,
      `  h2.h3.border-top.pt-3.mt-3.mb-3(id='section-1') この記事のポイント`,
      `  ul`,
      `    li ここにポイントが入ります。`,
      `    li ここにポイントが入ります。`,
      `    li ここにポイントが入ります。`,
      `section`,
      `  h2.h3.border-top.pt-3.mt-3.mb-3(id='section-2') ここに見出しが入ります1`,
      `  p`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
      `  table.table.table-bordered`,
      `    thead`,
      `      tr`,
      `        th 列1`,
      `        th 列2`,
      `        th 列3`,
      `        th 列4`,
      `    tbody`,
      `      tr`,
      `        td 内容`,
      `        td 内容`,
      `        td 内容`,
      `        td 内容`,
      `      tr`,
      `        td 内容`,
      `        td 内容`,
      `        td 内容`,
      `        td 内容`,
      `      tr`,
      `        td 内容`,
      `        td 内容`,
      `        td 内容`,
      `        td 内容`,
      `      tr`,
      `        td 内容`,
      `        td 内容`,
      `        td 内容`,
      `        td 内容`,
      `section`,
      `  h2.h3.border-top.pt-3.mt-3.mb-3(id='section-3') ここに見出しが入ります2`,
      `  p`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
      `  img.img-fluid(src='https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg' alt='ここに記事のタイトルが入ります')`,
      `section`,
      `  h2.h3.border-top.pt-3.mt-3.mb-3(id='section-4') まとめ`,
      `  p`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
      `    | ここにテキストが入ります。`,
    ].join('\n'))
  }

  async createArticleSections (article) {
    await model.articleSection.create({
      sort: 1,
      title: `この記事のポイント`,
      url: `#section-1`,
      articleId: article.id,
    })

    await model.articleSection.create({
      sort: 2,
      title: `ここに見出しが入ります1`,
      url: `#section-2`,
      articleId: article.id,
    })

    await model.articleSection.create({
      sort: 3,
      title: `ここに見出しが入ります2`,
      url: `#section-3`,
      articleId: article.id,
    })

    await model.articleSection.create({
      sort: 4,
      title: `まとめ`,
      url: `#section-4`,
      articleId: article.id,
    })
  }
}

if (require.main === module) {
  main()
}

async function main () {
  try {
    await new Main().run()
  } catch (err) {
    console.error(err.message)
    console.debug(err.stack)
  }
}
