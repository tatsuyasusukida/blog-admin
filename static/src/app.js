import ArticlePrivateAdd from './ui/article/private-add.vue'
import ArticlePrivateEdit from './ui/article/private-edit.vue'
import ArticlePrivateDelete from './ui/article/private-delete.vue'
import ArticlePrivateSerialSet from './ui/article/private-serial-set.vue'
import ArticlePrivateSerialUnset from './ui/article/private-serial-unset.vue'
import ArticlePrivateDocumentSet from './ui/article/private-document-set.vue'
import ArticlePrivateDocumentUnset from './ui/article/private-document-unset.vue'
import ArticlePrivateAuthorSet from './ui/article/private-author-set.vue'
import ArticlePrivateAuthorUnset from './ui/article/private-author-unset.vue'
import ArticleArticlePrivateAdd from './ui/article-article/private-add.vue'
import ArticleArticlePrivateEdit from './ui/article-article/private-edit.vue'
import ArticleArticlePrivateDelete from './ui/article-article/private-delete.vue'
import SerialPrivateAdd from './ui/serial/private-add.vue'
import SerialPrivateEdit from './ui/serial/private-edit.vue'
import SerialPrivateDelete from './ui/serial/private-delete.vue'
import SerialPrivateCategorySet from './ui/serial/private-category-set.vue'
import SerialPrivateCategoryUnset from './ui/serial/private-category-unset.vue'
import CategoryPrivateAdd from './ui/category/private-add.vue'
import CategoryPrivateEdit from './ui/category/private-edit.vue'
import CategoryPrivateDelete from './ui/category/private-delete.vue'
import TopicPrivateAdd from './ui/topic/private-add.vue'
import TopicPrivateEdit from './ui/topic/private-edit.vue'
import TopicPrivateDelete from './ui/topic/private-delete.vue'
import TopicArticlePrivateAdd from './ui/topic-article/private-add.vue'
import TopicArticlePrivateEdit from './ui/topic-article/private-edit.vue'
import TopicArticlePrivateDelete from './ui/topic-article/private-delete.vue'
import AuthorPrivateAdd from './ui/author/private-add.vue'
import AuthorPrivateEdit from './ui/author/private-edit.vue'
import AuthorPrivateDelete from './ui/author/private-delete.vue'
import PublicFilePrivateAdd from './ui/public-file/private-add.vue'
import PublicFilePrivateEdit from './ui/public-file/private-edit.vue'
import PublicFilePrivateDelete from './ui/public-file/private-delete.vue'
import DocumentPrivateAdd from './ui/document/private-add.vue'
import DocumentPrivateEdit from './ui/document/private-edit.vue'
import DocumentPrivateDelete from './ui/document/private-delete.vue'
import DocumentArticlePrivateAdd from './ui/document-article/private-add.vue'
import DocumentArticlePrivateEdit from './ui/document-article/private-edit.vue'
import DocumentArticlePrivateDelete from './ui/document-article/private-delete.vue'
import PrivateFilePrivateAdd from './ui/private-file/private-add.vue'
import PrivateFilePrivateEdit from './ui/private-file/private-edit.vue'
import PrivateFilePrivateDelete from './ui/private-file/private-delete.vue'
import RequestPrivateDelete from './ui/request/private-delete.vue'
import UnsubscribePrivateDelete from './ui/unsubscribe/private-delete.vue'
import EmailTemplatePrivateEdit from './ui/email-template/private-edit.vue'

class Main {
  async run () {
    const options = this.getVueOptions(window.location.pathname)

    if (options) {
      const vm = new Vue(options)

      if (vm.initialize) {
        await vm.initialize()
      }

      vm.$mount('#main')
    }
  }

  getVueOptions (pathname) {
    if (new RegExp('^/private/article/add/$').test(pathname)) {
      return ArticlePrivateAdd
    } else if (new RegExp('^/private/article/[0-9]+/edit/$').test(pathname)) {
      return ArticlePrivateEdit
    } else if (new RegExp('^/private/article/[0-9]+/delete/$').test(pathname)) {
      return ArticlePrivateDelete
    } else if (new RegExp('^/private/article/[0-9]+/serial/set/$').test(pathname)) {
      return ArticlePrivateSerialSet
    } else if (new RegExp('^/private/article/[0-9]+/serial/unset/$').test(pathname)) {
      return ArticlePrivateSerialUnset
    } else if (new RegExp('^/private/article/[0-9]+/document/set/$').test(pathname)) {
      return ArticlePrivateDocumentSet
    } else if (new RegExp('^/private/article/[0-9]+/document/unset/$').test(pathname)) {
      return ArticlePrivateDocumentUnset
    } else if (new RegExp('^/private/article/[0-9]+/author/set/$').test(pathname)) {
      return ArticlePrivateAuthorSet
    } else if (new RegExp('^/private/article/[0-9]+/author/unset/$').test(pathname)) {
      return ArticlePrivateAuthorUnset
    } else if (new RegExp('^/private/article-article/add/$').test(pathname)) {
      return ArticleArticlePrivateAdd
    } else if (new RegExp('^/private/article-article/[0-9]+/edit/$').test(pathname)) {
      return ArticleArticlePrivateEdit
    } else if (new RegExp('^/private/article-article/[0-9]+/delete/$').test(pathname)) {
      return ArticleArticlePrivateDelete
    } else if (new RegExp('^/private/serial/add/$').test(pathname)) {
      return SerialPrivateAdd
    } else if (new RegExp('^/private/serial/[0-9]+/edit/$').test(pathname)) {
      return SerialPrivateEdit
    } else if (new RegExp('^/private/serial/[0-9]+/delete/$').test(pathname)) {
      return SerialPrivateDelete
    } else if (new RegExp('^/private/serial/[0-9]+/category/set/$').test(pathname)) {
      return SerialPrivateCategorySet
    } else if (new RegExp('^/private/serial/[0-9]+/category/unset/$').test(pathname)) {
      return SerialPrivateCategoryUnset
    } else if (new RegExp('^/private/category/add/$').test(pathname)) {
      return CategoryPrivateAdd
    } else if (new RegExp('^/private/category/[0-9]+/edit/$').test(pathname)) {
      return CategoryPrivateEdit
    } else if (new RegExp('^/private/category/[0-9]+/delete/$').test(pathname)) {
      return CategoryPrivateDelete
    } else if (new RegExp('^/private/topic/add/$').test(pathname)) {
      return TopicPrivateAdd
    } else if (new RegExp('^/private/topic/[0-9]+/edit/$').test(pathname)) {
      return TopicPrivateEdit
    } else if (new RegExp('^/private/topic/[0-9]+/delete/$').test(pathname)) {
      return TopicPrivateDelete
    } else if (new RegExp('^/private/topic-article/add/$').test(pathname)) {
      return TopicArticlePrivateAdd
    } else if (new RegExp('^/private/topic-article/[0-9]+/edit/$').test(pathname)) {
      return TopicArticlePrivateEdit
    } else if (new RegExp('^/private/topic-article/[0-9]+/delete/$').test(pathname)) {
      return TopicArticlePrivateDelete
    } else if (new RegExp('^/private/author/add/$').test(pathname)) {
      return AuthorPrivateAdd
    } else if (new RegExp('^/private/author/[0-9]+/edit/$').test(pathname)) {
      return AuthorPrivateEdit
    } else if (new RegExp('^/private/author/[0-9]+/delete/$').test(pathname)) {
      return AuthorPrivateDelete
    } else if (new RegExp('^/private/public-file/add/$').test(pathname)) {
      return PublicFilePrivateAdd
    } else if (new RegExp('^/private/public-file/[0-9]+/edit/$').test(pathname)) {
      return PublicFilePrivateEdit
    } else if (new RegExp('^/private/public-file/[0-9]+/delete/$').test(pathname)) {
      return PublicFilePrivateDelete
    } else if (new RegExp('^/private/document/add/$').test(pathname)) {
      return DocumentPrivateAdd
    } else if (new RegExp('^/private/document/[0-9]+/edit/$').test(pathname)) {
      return DocumentPrivateEdit
    } else if (new RegExp('^/private/document/[0-9]+/delete/$').test(pathname)) {
      return DocumentPrivateDelete
    } else if (new RegExp('^/private/document-article/add/$').test(pathname)) {
      return DocumentArticlePrivateAdd
    } else if (new RegExp('^/private/document-article/[0-9]+/edit/$').test(pathname)) {
      return DocumentArticlePrivateEdit
    } else if (new RegExp('^/private/document-article/[0-9]+/delete/$').test(pathname)) {
      return DocumentArticlePrivateDelete
    } else if (new RegExp('^/private/private-file/add/$').test(pathname)) {
      return PrivateFilePrivateAdd
    } else if (new RegExp('^/private/private-file/[0-9]+/edit/$').test(pathname)) {
      return PrivateFilePrivateEdit
    } else if (new RegExp('^/private/private-file/[0-9]+/delete/$').test(pathname)) {
      return PrivateFilePrivateDelete
    } else if (new RegExp('^/private/request/[0-9]+/delete/$').test(pathname)) {
      return RequestPrivateDelete
    } else if (new RegExp('^/private/unsubscribe/[0-9]+/delete/$').test(pathname)) {
      return UnsubscribePrivateDelete
    } else if (new RegExp('^/private/email-template/[0-9]+/edit/$').test(pathname)) {
      return EmailTemplatePrivateEdit
    } else {
      return null
    }
  }
}

async function main () {
  try {
    await new Main().run()
  } catch (err) {
    console.error(err.message)
    console.debug(err.stack)
  }
}

main()
