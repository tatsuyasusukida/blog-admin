const path = require('path')
const fsPromises = require('fs/promises')
const puppeteer = require('puppeteer')

class Main {
  async run () {
    const browser = await puppeteer.launch()

    try {
      const page = await browser.newPage()

      await page.setViewport({width: 800, height: 1050, deviceScaleFactor: 2})

      const items = this.getItems()

      if (process.env.APP_SESSION) {
        await page.setCookie({
          name: 'appSession',
          value: process.env.APP_SESSION,
          url: 'http://127.0.0.1:3001',
        })
      }

      for (const [pathname, file] of items) {
        const dirname = path.join(__dirname, '../dist/img')
        const destination = path.join(dirname, file + '.png')

        await fsPromises.mkdir(path.dirname(destination), {recursive: true})
        await page.goto('http://127.0.0.1:3001' + pathname)
        await new Promise(resolve => setTimeout(resolve, 200))
        await page.screenshot({path: destination})
      }
    } finally {
      await browser.close()
    }
  }

  getItems () {
    return [
      ['/', 'static-page/public-home'],
      ['/public/layout/', 'static-page/public-layout'],
      ['/public/iam/signin/unauthorized/', 'iam/public-signin-unauthorized'],
      ['/public/iam/signout/finish/', 'iam/public-signout-finish'],

      ['/private/', 'static-page/private-home'],
      ['/private/layout/', 'static-page/private-layout'],
      ['/private/iam/signout/', 'iam/private-signout'],

      ['/private/article/', 'article/private-index'],
      ['/private/article/add/', 'article/private-add'],
      ['/private/article/add/finish/', 'article/private-add-finish'],
      ['/private/article/1/', 'article/private-view'],
      ['/private/article/1/edit/', 'article/private-edit'],
      ['/private/article/1/edit/finish/', 'article/private-edit-finish'],
      ['/private/article/1/delete/', 'article/private-delete'],
      ['/private/article/delete/finish/', 'article/private-delete-finish'],
      ['/private/article/1/serial/set/', 'article/private-serial-set'],
      ['/private/article/1/serial/set/finish/', 'article/private-serial-set-finish'],
      ['/private/article/1/serial/unset/', 'article/private-serial-unset'],
      ['/private/article/1/serial/unset/finish/', 'article/private-serial-unset-finish'],
      ['/private/article/1/document/set/', 'article/private-document-set'],
      ['/private/article/1/document/set/finish/', 'article/private-document-set-finish'],
      ['/private/article/1/document/unset/', 'article/private-document-unset'],
      ['/private/article/1/document/unset/finish/', 'article/private-document-unset-finish'],
      ['/private/article/1/author/set/', 'article/private-author-set'],
      ['/private/article/1/author/set/finish/', 'article/private-author-set-finish'],
      ['/private/article/1/author/unset/', 'article/private-author-unset'],
      ['/private/article/1/author/unset/finish/', 'article/private-author-unset-finish'],

      ['/private/article-article/', 'article-article/private-index'],
      ['/private/article-article/add/', 'article-article/private-add'],
      ['/private/article-article/add/finish/', 'article-article/private-add-finish'],
      ['/private/article-article/1/', 'article-article/private-view'],
      ['/private/article-article/1/edit/', 'article-article/private-edit'],
      ['/private/article-article/1/edit/finish/', 'article-article/private-edit-finish'],
      ['/private/article-article/1/delete/', 'article-article/private-delete'],
      ['/private/article-article/delete/finish/', 'article-article/private-delete-finish'],

      ['/private/serial/', 'serial/private-index'],
      ['/private/serial/add/', 'serial/private-add'],
      ['/private/serial/add/finish/', 'serial/private-add-finish'],
      ['/private/serial/1/', 'serial/private-view'],
      ['/private/serial/1/edit/', 'serial/private-edit'],
      ['/private/serial/1/edit/finish/', 'serial/private-edit-finish'],
      ['/private/serial/1/delete/', 'serial/private-delete'],
      ['/private/serial/delete/finish/', 'serial/private-delete-finish'],
      ['/private/serial/1/category/set/', 'serial/private-category-set'],
      ['/private/serial/1/category/set/finish/', 'serial/private-category-set-finish'],
      ['/private/serial/1/category/unset/', 'serial/private-category-unset'],
      ['/private/serial/1/category/unset/finish/', 'serial/private-category-unset-finish'],

      ['/private/category/', 'category/private-index'],
      ['/private/category/add/', 'category/private-add'],
      ['/private/category/add/finish/', 'category/private-add-finish'],
      ['/private/category/1/', 'category/private-view'],
      ['/private/category/1/edit/', 'category/private-edit'],
      ['/private/category/1/edit/finish/', 'category/private-edit-finish'],
      ['/private/category/1/delete/', 'category/private-delete'],
      ['/private/category/delete/finish/', 'category/private-delete-finish'],

      ['/private/topic/', 'topic/private-index'],
      ['/private/topic/add/', 'topic/private-add'],
      ['/private/topic/add/finish/', 'topic/private-add-finish'],
      ['/private/topic/1/', 'topic/private-view'],
      ['/private/topic/1/edit/', 'topic/private-edit'],
      ['/private/topic/1/edit/finish/', 'topic/private-edit-finish'],
      ['/private/topic/1/delete/', 'topic/private-delete'],
      ['/private/topic/delete/finish/', 'topic/private-delete-finish'],

      ['/private/topic-article/', 'topic-article/private-index'],
      ['/private/topic-article/add/', 'topic-article/private-add'],
      ['/private/topic-article/add/finish/', 'topic-article/private-add-finish'],
      ['/private/topic-article/1/', 'topic-article/private-view'],
      ['/private/topic-article/1/edit/', 'topic-article/private-edit'],
      ['/private/topic-article/1/edit/finish/', 'topic-article/private-edit-finish'],
      ['/private/topic-article/1/delete/', 'topic-article/private-delete'],
      ['/private/topic-article/delete/finish/', 'topic-article/private-delete-finish'],

      ['/private/author/', 'author/private-index'],
      ['/private/author/add/', 'author/private-add'],
      ['/private/author/add/finish/', 'author/private-add-finish'],
      ['/private/author/1/', 'author/private-view'],
      ['/private/author/1/edit/', 'author/private-edit'],
      ['/private/author/1/edit/finish/', 'author/private-edit-finish'],
      ['/private/author/1/delete/', 'author/private-delete'],
      ['/private/author/delete/finish/', 'author/private-delete-finish'],

      ['/private/public-file/', 'public-file/private-index'],
      ['/private/public-file/add/', 'public-file/private-add'],
      ['/private/public-file/add/finish/', 'public-file/private-add-finish'],
      ['/private/public-file/1/', 'public-file/private-view'],
      ['/private/public-file/1/edit/', 'public-file/private-edit'],
      ['/private/public-file/1/edit/finish/', 'public-file/private-edit-finish'],
      ['/private/public-file/1/delete/', 'public-file/private-delete'],
      ['/private/public-file/delete/finish/', 'public-file/private-delete-finish'],

      ['/private/document/', 'document/private-index'],
      ['/private/document/add/', 'document/private-add'],
      ['/private/document/add/finish/', 'document/private-add-finish'],
      ['/private/document/1/', 'document/private-view'],
      ['/private/document/1/edit/', 'document/private-edit'],
      ['/private/document/1/edit/finish/', 'document/private-edit-finish'],
      ['/private/document/1/delete/', 'document/private-delete'],
      ['/private/document/delete/finish/', 'document/private-delete-finish'],

      ['/private/document-article/', 'document-article/private-index'],
      ['/private/document-article/add/', 'document-article/private-add'],
      ['/private/document-article/add/finish/', 'document-article/private-add-finish'],
      ['/private/document-article/1/', 'document-article/private-view'],
      ['/private/document-article/1/edit/', 'document-article/private-edit'],
      ['/private/document-article/1/edit/finish/', 'document-article/private-edit-finish'],
      ['/private/document-article/1/delete/', 'document-article/private-delete'],
      ['/private/document-article/delete/finish/', 'document-article/private-delete-finish'],

      ['/private/private-file/', 'private-file/private-index'],
      ['/private/private-file/add/', 'private-file/private-add'],
      ['/private/private-file/add/finish/', 'private-file/private-add-finish'],
      ['/private/private-file/1/', 'private-file/private-view'],
      ['/private/private-file/1/edit/', 'private-file/private-edit'],
      ['/private/private-file/1/edit/finish/', 'private-file/private-edit-finish'],
      ['/private/private-file/1/delete/', 'private-file/private-delete'],
      ['/private/private-file/delete/finish/', 'private-file/private-delete-finish'],

      ['/private/request/', 'request/private-index'],
      ['/private/request/1/', 'request/private-view'],
      ['/private/request/1/delete/', 'request/private-delete'],
      ['/private/request/delete/finish/', 'request/private-delete-finish'],

      ['/private/unsubscribe/', 'unsubscribe/private-index'],
      ['/private/unsubscribe/1/', 'unsubscribe/private-view'],
      ['/private/unsubscribe/1/delete/', 'unsubscribe/private-delete'],
      ['/private/unsubscribe/delete/finish/', 'unsubscribe/private-delete-finish'],

      ['/private/email-template/', 'email-template/private-index'],
      ['/private/email-template/1/', 'email-template/private-view'],
      ['/private/email-template/1/edit/', 'email-template/private-edit'],
      ['/private/email-template/1/edit/finish/', 'email-template/private-edit-finish'],

      ['/private/email/', 'email/private-index'],
      ['/private/email/1/', 'email/private-view'],
    ]
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
