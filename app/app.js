const path = require('path')
const crypto = require('crypto')
const helmet = require('helmet')
const morgan = require('morgan')
const express = require('express')
const nocache = require('nocache')
const winston = require('winston')
const sgMail = require('@sendgrid/mail')
const proxyMiddleware = require('proxy-middleware')
const {auth, requiresAuth} = require('express-openid-connect')
const model = require('./model')
const {Storage} = require('@google-cloud/storage')
const {Converter} = require('./lib/Converter')
const {Initializer} = require('./lib/Initializer')
const {Paginator} = require('./lib/Paginator')
const {Validator} = require('./lib/Validator')
const {QueryTypes, Op} = model.Sequelize

class App {
  constructor () {
    this.converter = new Converter()
    this.initializer = new Initializer()
    this.paginator = new Paginator()
    this.validator = new Validator()

    this.router = express()
    this.router.set('strict routing', true)
    this.router.set('view engine', 'pug')
    this.router.set('views', path.join(__dirname, 'view'))
    this.router.use(this.onRequestInitialize.bind(this))
    this.router.use(helmet({
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          "base-uri": ["'self'"],
          "block-all-mixed-content": [],
          "font-src": ["'self'", "https:", "data:"],
          "frame-ancestors": ["'self'"],
          "img-src": ["'self'", "https:", "data:"],
          "object-src": ["'none'"],
          "script-src": ["'self'"],
          "script-src-attr": ["'none'"],
          "style-src": ["'self'", "https:", "'unsafe-inline'"],
          "upgrade-insecure-requests": [],
          "connect-src": ["'self'", "https://storage.googleapis.com"],
        },
      },
    }))

    this.router.use(morgan(process.env.LOG_ACCESS, {
      stream: {
        write (message) {
          winston.loggers.get('access').info(message.trim())
        },
      },
    }))

    if (process.env.IS_DEMO !== '1') {
      this.router.use(auth({
        authRequired: false,
        auth0Logout: true,
        secret: process.env.AUTH0_SECRET,
        baseURL: process.env.AUTH0_BASE_URL,
        clientID: process.env.AUTH0_CLIENT_ID,
        issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
        routes: {
          login: '/public/iam/signin/',
          logout: '/public/iam/signout/',
          postLogoutRedirect: '/public/iam/signout/finish/',
          callback: '/public/iam/signin/callback/',
        },
      }))
    }

    if (process.env.PROXY === '1') {
      this.router.use('/static/', proxyMiddleware('http://127.0.0.1:8081'))
    } else {
      this.router.use('/static/', express.static(path.join(__dirname, 'static')))
    }

    this.router.get('/', (req, res) => res.render('static-page/public-home'))
    this.router.get('/public/layout/', (req, res) => res.render('static-page/public-layout'))
    this.router.get('/public/iam/signin/unauthorized/', (req, res) => res.render('iam/public-signin-unauthorized'))

    if (process.env.IS_DEMO === '1') {
      this.router.get('/public/iam/signout/', (req, res) => res.redirect('./finish/'))
    }

    this.router.get('/public/iam/signout/finish/', (req, res) => res.render('iam/public-signout-finish'))

    if (process.env.IS_DEMO !== '1') {
      this.router.use('/private/', requiresAuth())
      this.router.use('/private/', this.onRequestAuthorize.bind(this))
    }

    this.router.get('/private/', (req, res) => res.render('static-page/private-home'))
    this.router.get('/private/layout/', (req, res) => res.render('static-page/private-layout'))
    this.router.get('/private/iam/signout/', (req, res) => res.render('iam/private-signout'))

    this.router.get('/private/article/', this.onRequestPrivateArticleIndex.bind(this))
    this.router.get('/private/article/', (req, res) => res.render('article/private-index'))
    this.router.get('/private/article/add/', (req, res) => res.render('article/private-add'))
    this.router.get('/private/article/add/finish/', (req, res) => res.render('article/private-add-finish'))
    this.router.use('/private/article/:articleId([0-9]+)/', this.onRequestFindArticle.bind(this))
    this.router.get('/private/article/:articleId([0-9]+)/', this.onRequestPrivateArticleView.bind(this))
    this.router.get('/private/article/:articleId([0-9]+)/', (req, res) => res.render('article/private-view'))
    this.router.get('/private/article/:articleId([0-9]+)/edit/', (req, res) => res.render('article/private-edit'))
    this.router.get('/private/article/:articleId([0-9]+)/edit/finish/', (req, res) => res.render('article/private-edit-finish'))
    this.router.get('/private/article/:articleId([0-9]+)/delete/', (req, res) => res.render('article/private-delete'))
    this.router.get('/private/article/delete/finish/', (req, res) => res.render('article/private-delete-finish'))
    this.router.get('/private/article/:articleId([0-9]+)/serial/set/', (req, res) => res.render('article/private-serial-set'))
    this.router.get('/private/article/:articleId([0-9]+)/serial/set/finish/', (req, res) => res.render('article/private-serial-set-finish'))
    this.router.get('/private/article/:articleId([0-9]+)/serial/unset/', (req, res) => res.render('article/private-serial-unset'))
    this.router.get('/private/article/:articleId([0-9]+)/serial/unset/finish/', (req, res) => res.render('article/private-serial-unset-finish'))
    this.router.get('/private/article/:articleId([0-9]+)/document/set/', (req, res) => res.render('article/private-document-set'))
    this.router.get('/private/article/:articleId([0-9]+)/document/set/finish/', (req, res) => res.render('article/private-document-set-finish'))
    this.router.get('/private/article/:articleId([0-9]+)/document/unset/', (req, res) => res.render('article/private-document-unset'))
    this.router.get('/private/article/:articleId([0-9]+)/document/unset/finish/', (req, res) => res.render('article/private-document-unset-finish'))
    this.router.get('/private/article/:articleId([0-9]+)/author/set/', (req, res) => res.render('article/private-author-set'))
    this.router.get('/private/article/:articleId([0-9]+)/author/set/finish/', (req, res) => res.render('article/private-author-set-finish'))
    this.router.get('/private/article/:articleId([0-9]+)/author/unset/', (req, res) => res.render('article/private-author-unset'))
    this.router.get('/private/article/:articleId([0-9]+)/author/unset/finish/', (req, res) => res.render('article/private-author-unset-finish'))

    this.router.get('/private/article-article/', this.onRequestPrivateArticleArticleIndex.bind(this))
    this.router.get('/private/article-article/', (req, res) => res.render('article-article/private-index'))
    this.router.get('/private/article-article/add/', (req, res) => res.render('article-article/private-add'))
    this.router.get('/private/article-article/add/finish/', (req, res) => res.render('article-article/private-add-finish'))
    this.router.use('/private/article-article/:articleArticleId([0-9]+)/', this.onRequestFindArticleArticle.bind(this))
    this.router.get('/private/article-article/:articleArticleId([0-9]+)/', this.onRequestPrivateArticleArticleView.bind(this))
    this.router.get('/private/article-article/:articleArticleId([0-9]+)/', (req, res) => res.render('article-article/private-view'))
    this.router.get('/private/article-article/:articleArticleId([0-9]+)/edit/', (req, res) => res.render('article-article/private-edit'))
    this.router.get('/private/article-article/:articleArticleId([0-9]+)/edit/finish/', (req, res) => res.render('article-article/private-edit-finish'))
    this.router.get('/private/article-article/:articleArticleId([0-9]+)/delete/', (req, res) => res.render('article-article/private-delete'))
    this.router.get('/private/article-article/delete/finish/', (req, res) => res.render('article-article/private-delete-finish'))

    this.router.get('/private/serial/', this.onRequestPrivateSerialIndex.bind(this))
    this.router.get('/private/serial/', (req, res) => res.render('serial/private-index'))
    this.router.get('/private/serial/add/', (req, res) => res.render('serial/private-add'))
    this.router.get('/private/serial/add/finish/', (req, res) => res.render('serial/private-add-finish'))
    this.router.use('/private/serial/:serialId([0-9]+)/', this.onRequestFindSerial.bind(this))
    this.router.get('/private/serial/:serialId([0-9]+)/', this.onRequestPrivateSerialView.bind(this))
    this.router.get('/private/serial/:serialId([0-9]+)/', (req, res) => res.render('serial/private-view'))
    this.router.get('/private/serial/:serialId([0-9]+)/edit/', (req, res) => res.render('serial/private-edit'))
    this.router.get('/private/serial/:serialId([0-9]+)/edit/finish/', (req, res) => res.render('serial/private-edit-finish'))
    this.router.get('/private/serial/:serialId([0-9]+)/delete/', (req, res) => res.render('serial/private-delete'))
    this.router.get('/private/serial/delete/finish/', (req, res) => res.render('serial/private-delete-finish'))
    this.router.get('/private/serial/:serialId([0-9]+)/category/set/', (req, res) => res.render('serial/private-category-set'))
    this.router.get('/private/serial/:serialId([0-9]+)/category/set/finish/', (req, res) => res.render('serial/private-category-set-finish'))
    this.router.get('/private/serial/:serialId([0-9]+)/category/unset/', (req, res) => res.render('serial/private-category-unset'))
    this.router.get('/private/serial/:serialId([0-9]+)/category/unset/finish/', (req, res) => res.render('serial/private-category-unset-finish'))

    this.router.get('/private/category/', this.onRequestPrivateCategoryIndex.bind(this))
    this.router.get('/private/category/', (req, res) => res.render('category/private-index'))
    this.router.get('/private/category/add/', (req, res) => res.render('category/private-add'))
    this.router.get('/private/category/add/finish/', (req, res) => res.render('category/private-add-finish'))
    this.router.use('/private/category/:categoryId([0-9]+)/', this.onRequestFindCategory.bind(this))
    this.router.get('/private/category/:categoryId([0-9]+)/', this.onRequestPrivateCategoryView.bind(this))
    this.router.get('/private/category/:categoryId([0-9]+)/', (req, res) => res.render('category/private-view'))
    this.router.get('/private/category/:categoryId([0-9]+)/edit/', (req, res) => res.render('category/private-edit'))
    this.router.get('/private/category/:categoryId([0-9]+)/edit/finish/', (req, res) => res.render('category/private-edit-finish'))
    this.router.get('/private/category/:categoryId([0-9]+)/delete/', (req, res) => res.render('category/private-delete'))
    this.router.get('/private/category/delete/finish/', (req, res) => res.render('category/private-delete-finish'))

    this.router.get('/private/topic/', this.onRequestPrivateTopicIndex.bind(this))
    this.router.get('/private/topic/', (req, res) => res.render('topic/private-index'))
    this.router.get('/private/topic/add/', (req, res) => res.render('topic/private-add'))
    this.router.get('/private/topic/add/finish/', (req, res) => res.render('topic/private-add-finish'))
    this.router.use('/private/topic/:topicId([0-9]+)/', this.onRequestFindTopic.bind(this))
    this.router.get('/private/topic/:topicId([0-9]+)/', this.onRequestPrivateTopicView.bind(this))
    this.router.get('/private/topic/:topicId([0-9]+)/', (req, res) => res.render('topic/private-view'))
    this.router.get('/private/topic/:topicId([0-9]+)/edit/', (req, res) => res.render('topic/private-edit'))
    this.router.get('/private/topic/:topicId([0-9]+)/edit/finish/', (req, res) => res.render('topic/private-edit-finish'))
    this.router.get('/private/topic/:topicId([0-9]+)/delete/', (req, res) => res.render('topic/private-delete'))
    this.router.get('/private/topic/delete/finish/', (req, res) => res.render('topic/private-delete-finish'))

    this.router.get('/private/topic-article/', this.onRequestPrivateTopicArticleIndex.bind(this))
    this.router.get('/private/topic-article/', (req, res) => res.render('topic-article/private-index'))
    this.router.get('/private/topic-article/add/', (req, res) => res.render('topic-article/private-add'))
    this.router.get('/private/topic-article/add/finish/', (req, res) => res.render('topic-article/private-add-finish'))
    this.router.use('/private/topic-article/:topicArticleId([0-9]+)/', this.onRequestFindTopicArticle.bind(this))
    this.router.get('/private/topic-article/:topicArticleId([0-9]+)/', this.onRequestPrivateTopicArticleView.bind(this))
    this.router.get('/private/topic-article/:topicArticleId([0-9]+)/', (req, res) => res.render('topic-article/private-view'))
    this.router.get('/private/topic-article/:topicArticleId([0-9]+)/edit/', (req, res) => res.render('topic-article/private-edit'))
    this.router.get('/private/topic-article/:topicArticleId([0-9]+)/edit/finish/', (req, res) => res.render('topic-article/private-edit-finish'))
    this.router.get('/private/topic-article/:topicArticleId([0-9]+)/delete/', (req, res) => res.render('topic-article/private-delete'))
    this.router.get('/private/topic-article/delete/finish/', (req, res) => res.render('topic-article/private-delete-finish'))

    this.router.get('/private/author/', this.onRequestPrivateAuthorIndex.bind(this))
    this.router.get('/private/author/', (req, res) => res.render('author/private-index'))
    this.router.get('/private/author/add/', (req, res) => res.render('author/private-add'))
    this.router.get('/private/author/add/finish/', (req, res) => res.render('author/private-add-finish'))
    this.router.use('/private/author/:authorId([0-9]+)/', this.onRequestFindAuthor.bind(this))
    this.router.get('/private/author/:authorId([0-9]+)/', this.onRequestPrivateAuthorView.bind(this))
    this.router.get('/private/author/:authorId([0-9]+)/', (req, res) => res.render('author/private-view'))
    this.router.get('/private/author/:authorId([0-9]+)/edit/', (req, res) => res.render('author/private-edit'))
    this.router.get('/private/author/:authorId([0-9]+)/edit/finish/', (req, res) => res.render('author/private-edit-finish'))
    this.router.get('/private/author/:authorId([0-9]+)/delete/', (req, res) => res.render('author/private-delete'))
    this.router.get('/private/author/delete/finish/', (req, res) => res.render('author/private-delete-finish'))

    this.router.get('/private/public-file/', this.onRequestPrivatePublicFileIndex.bind(this))
    this.router.get('/private/public-file/', (req, res) => res.render('public-file/private-index'))
    this.router.get('/private/public-file/add/', (req, res) => res.render('public-file/private-add'))
    this.router.get('/private/public-file/add/finish/', (req, res) => res.render('public-file/private-add-finish'))
    this.router.use('/private/public-file/:publicFileId([0-9]+)/', this.onRequestFindPublicFile.bind(this))
    this.router.get('/private/public-file/:publicFileId([0-9]+)/', this.onRequestPrivatePublicFileView.bind(this))
    this.router.get('/private/public-file/:publicFileId([0-9]+)/', (req, res) => res.render('public-file/private-view'))
    this.router.get('/private/public-file/:publicFileId([0-9]+)/edit/', (req, res) => res.render('public-file/private-edit'))
    this.router.get('/private/public-file/:publicFileId([0-9]+)/edit/finish/', (req, res) => res.render('public-file/private-edit-finish'))
    this.router.get('/private/public-file/:publicFileId([0-9]+)/delete/', (req, res) => res.render('public-file/private-delete'))
    this.router.get('/private/public-file/delete/finish/', (req, res) => res.render('public-file/private-delete-finish'))

    this.router.get('/private/document/', this.onRequestPrivateDocumentIndex.bind(this))
    this.router.get('/private/document/', (req, res) => res.render('document/private-index'))
    this.router.get('/private/document/add/', (req, res) => res.render('document/private-add'))
    this.router.get('/private/document/add/finish/', (req, res) => res.render('document/private-add-finish'))
    this.router.use('/private/document/:documentId([0-9]+)/', this.onRequestFindDocument.bind(this))
    this.router.get('/private/document/:documentId([0-9]+)/', this.onRequestPrivateDocumentView.bind(this))
    this.router.get('/private/document/:documentId([0-9]+)/', (req, res) => res.render('document/private-view'))
    this.router.get('/private/document/:documentId([0-9]+)/edit/', (req, res) => res.render('document/private-edit'))
    this.router.get('/private/document/:documentId([0-9]+)/edit/finish/', (req, res) => res.render('document/private-edit-finish'))
    this.router.get('/private/document/:documentId([0-9]+)/delete/', (req, res) => res.render('document/private-delete'))
    this.router.get('/private/document/delete/finish/', (req, res) => res.render('document/private-delete-finish'))

    this.router.get('/private/document-article/', this.onRequestPrivateDocumentArticleIndex.bind(this))
    this.router.get('/private/document-article/', (req, res) => res.render('document-article/private-index'))
    this.router.get('/private/document-article/add/', (req, res) => res.render('document-article/private-add'))
    this.router.get('/private/document-article/add/finish/', (req, res) => res.render('document-article/private-add-finish'))
    this.router.use('/private/document-article/:documentArticleId([0-9]+)/', this.onRequestFindDocumentArticle.bind(this))
    this.router.get('/private/document-article/:documentArticleId([0-9]+)/', this.onRequestPrivateDocumentArticleView.bind(this))
    this.router.get('/private/document-article/:documentArticleId([0-9]+)/', (req, res) => res.render('document-article/private-view'))
    this.router.get('/private/document-article/:documentArticleId([0-9]+)/edit/', (req, res) => res.render('document-article/private-edit'))
    this.router.get('/private/document-article/:documentArticleId([0-9]+)/edit/finish/', (req, res) => res.render('document-article/private-edit-finish'))
    this.router.get('/private/document-article/:documentArticleId([0-9]+)/delete/', (req, res) => res.render('document-article/private-delete'))
    this.router.get('/private/document-article/delete/finish/', (req, res) => res.render('document-article/private-delete-finish'))

    this.router.get('/private/private-file/', this.onRequestPrivatePrivateFileIndex.bind(this))
    this.router.get('/private/private-file/', (req, res) => res.render('private-file/private-index'))
    this.router.get('/private/private-file/add/', (req, res) => res.render('private-file/private-add'))
    this.router.get('/private/private-file/add/finish/', (req, res) => res.render('private-file/private-add-finish'))
    this.router.use('/private/private-file/:privateFileId([0-9]+)/', this.onRequestFindPrivateFile.bind(this))
    this.router.get('/private/private-file/:privateFileId([0-9]+)/', this.onRequestPrivatePrivateFileView.bind(this))
    this.router.get('/private/private-file/:privateFileId([0-9]+)/', (req, res) => res.render('private-file/private-view'))
    this.router.get('/private/private-file/:privateFileId([0-9]+)/edit/', (req, res) => res.render('private-file/private-edit'))
    this.router.get('/private/private-file/:privateFileId([0-9]+)/edit/finish/', (req, res) => res.render('private-file/private-edit-finish'))
    this.router.get('/private/private-file/:privateFileId([0-9]+)/delete/', (req, res) => res.render('private-file/private-delete'))
    this.router.get('/private/private-file/delete/finish/', (req, res) => res.render('private-file/private-delete-finish'))

    this.router.get('/private/request/', this.onRequestPrivateRequestIndex.bind(this))
    this.router.get('/private/request/', (req, res) => res.render('request/private-index'))
    this.router.use('/private/request/:requestId([0-9]+)/', this.onRequestFindRequest.bind(this))
    this.router.get('/private/request/:requestId([0-9]+)/', this.onRequestPrivateRequestView.bind(this))
    this.router.get('/private/request/:requestId([0-9]+)/', (req, res) => res.render('request/private-view'))
    this.router.get('/private/request/:requestId([0-9]+)/delete/', (req, res) => res.render('request/private-delete'))
    this.router.get('/private/request/delete/finish/', (req, res) => res.render('request/private-delete-finish'))

    this.router.get('/private/unsubscribe/', this.onRequestPrivateUnsubscribeIndex.bind(this))
    this.router.get('/private/unsubscribe/', (req, res) => res.render('unsubscribe/private-index'))
    this.router.use('/private/unsubscribe/:unsubscribeId([0-9]+)/', this.onRequestFindUnsubscribe.bind(this))
    this.router.get('/private/unsubscribe/:unsubscribeId([0-9]+)/', this.onRequestPrivateUnsubscribeView.bind(this))
    this.router.get('/private/unsubscribe/:unsubscribeId([0-9]+)/', (req, res) => res.render('unsubscribe/private-view'))
    this.router.get('/private/unsubscribe/:unsubscribeId([0-9]+)/delete/', (req, res) => res.render('unsubscribe/private-delete'))
    this.router.get('/private/unsubscribe/delete/finish/', (req, res) => res.render('unsubscribe/private-delete-finish'))

    this.router.get('/private/email-template/', this.onRequestPrivateEmailTemplateIndex.bind(this))
    this.router.get('/private/email-template/', (req, res) => res.render('email-template/private-index'))
    this.router.use('/private/email-template/:emailTemplateId([0-9]+)/', this.onRequestFindEmailTemplate.bind(this))
    this.router.get('/private/email-template/:emailTemplateId([0-9]+)/', this.onRequestPrivateEmailTemplateView.bind(this))
    this.router.get('/private/email-template/:emailTemplateId([0-9]+)/', (req, res) => res.render('email-template/private-view'))
    this.router.get('/private/email-template/:emailTemplateId([0-9]+)/edit/', (req, res) => res.render('email-template/private-edit'))
    this.router.get('/private/email-template/:emailTemplateId([0-9]+)/edit/finish/', (req, res) => res.render('email-template/private-edit-finish'))

    this.router.get('/private/email/', this.onRequestPrivateEmailIndex.bind(this))
    this.router.get('/private/email/', (req, res) => res.render('email/private-index'))
    this.router.use('/private/email/:emailId([0-9]+)/', this.onRequestFindEmail.bind(this))
    this.router.get('/private/email/:emailId([0-9]+)/', this.onRequestPrivateEmailView.bind(this))
    this.router.get('/private/email/:emailId([0-9]+)/', (req, res) => res.render('email/private-view'))

    this.router.use('/api/v1/', nocache())
    this.router.use('/api/v1/', express.json())

    this.router.use('/api/v1/', (req, res, next) => {
      if (process.env.IS_DEMO === '1' && req.method !== 'GET') {
        res.status(403).end()
      } else {
        next() 
      }
    })

    if (process.env.IS_DEMO !== '1') {
      this.router.use('/api/v1/private/', this.onRequestAuthorizeApi.bind(this))
    }

    this.router.get('/api/v1/private/article/add/initialize', this.onRequestApiV1PrivateArticleAddInitialize.bind(this))
    this.router.get('/api/v1/private/article/add/article-section', this.onRequestApiV1PrivateArticleAddArticleSection.bind(this))
    this.router.post('/api/v1/private/article/add/validate', this.onRequestApiV1PrivateArticleAddValidate.bind(this))
    this.router.post('/api/v1/private/article/add/submit', this.onRequestApiV1PrivateArticleAddSubmit.bind(this))
    this.router.use('/api/v1/private/article/:articleId([0-9a-z-]+)/', this.onRequestFindArticle.bind(this))
    this.router.get('/api/v1/private/article/:articleId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivateArticleEditInitialize.bind(this))
    this.router.get('/api/v1/private/article/:articleId([0-9a-z-]+)/edit/article-section', this.onRequestApiV1PrivateArticleEditArticleSection.bind(this))
    this.router.put('/api/v1/private/article/:articleId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivateArticleEditValidate.bind(this))
    this.router.put('/api/v1/private/article/:articleId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivateArticleEditSubmit.bind(this))
    this.router.delete('/api/v1/private/article/:articleId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivateArticleDeleteSubmit.bind(this))
    this.router.use('/api/v1/private/article/:articleId([0-9a-z-]+)/serial/set/', this.onRequestFindSerialArticle.bind(this))
    this.router.get('/api/v1/private/article/:articleId([0-9a-z-]+)/serial/set/initialize', this.onRequestApiV1PrivateArticleSerialSetInitialize.bind(this))
    this.router.put('/api/v1/private/article/:articleId([0-9a-z-]+)/serial/set/validate', this.onRequestApiV1PrivateArticleSerialSetValidate.bind(this))
    this.router.put('/api/v1/private/article/:articleId([0-9a-z-]+)/serial/set/submit', this.onRequestApiV1PrivateArticleSerialSetSubmit.bind(this))
    this.router.use('/api/v1/private/article/:articleId([0-9a-z-]+)/serial/unset/', this.onRequestFindSerialArticle.bind(this))
    this.router.delete('/api/v1/private/article/:articleId([0-9a-z-]+)/serial/unset/submit', this.onRequestApiV1PrivateArticleSerialUnsetSubmit.bind(this))
    this.router.use('/api/v1/private/article/:articleId([0-9a-z-]+)/document/set/', this.onRequestFindArticleDocument.bind(this))
    this.router.get('/api/v1/private/article/:articleId([0-9a-z-]+)/document/set/initialize', this.onRequestApiV1PrivateArticleDocumentSetInitialize.bind(this))
    this.router.put('/api/v1/private/article/:articleId([0-9a-z-]+)/document/set/validate', this.onRequestApiV1PrivateArticleDocumentSetValidate.bind(this))
    this.router.put('/api/v1/private/article/:articleId([0-9a-z-]+)/document/set/submit', this.onRequestApiV1PrivateArticleDocumentSetSubmit.bind(this))
    this.router.use('/api/v1/private/article/:articleId([0-9a-z-]+)/document/unset/', this.onRequestFindArticleDocument.bind(this))
    this.router.delete('/api/v1/private/article/:articleId([0-9a-z-]+)/document/unset/submit', this.onRequestApiV1PrivateArticleDocumentUnsetSubmit.bind(this))
    this.router.use('/api/v1/private/article/:articleId([0-9a-z-]+)/author/set/', this.onRequestFindAuthorArticle.bind(this))
    this.router.get('/api/v1/private/article/:articleId([0-9a-z-]+)/author/set/initialize', this.onRequestApiV1PrivateArticleAuthorSetInitialize.bind(this))
    this.router.put('/api/v1/private/article/:articleId([0-9a-z-]+)/author/set/validate', this.onRequestApiV1PrivateArticleAuthorSetValidate.bind(this))
    this.router.put('/api/v1/private/article/:articleId([0-9a-z-]+)/author/set/submit', this.onRequestApiV1PrivateArticleAuthorSetSubmit.bind(this))
    this.router.use('/api/v1/private/article/:articleId([0-9a-z-]+)/author/unset/', this.onRequestFindAuthorArticle.bind(this))
    this.router.delete('/api/v1/private/article/:articleId([0-9a-z-]+)/author/unset/submit', this.onRequestApiV1PrivateArticleAuthorUnsetSubmit.bind(this))

    this.router.get('/api/v1/private/article-article/add/initialize', this.onRequestApiV1PrivateArticleArticleAddInitialize.bind(this))
    this.router.post('/api/v1/private/article-article/add/validate', this.onRequestApiV1PrivateArticleArticleAddValidate.bind(this))
    this.router.post('/api/v1/private/article-article/add/submit', this.onRequestApiV1PrivateArticleArticleAddSubmit.bind(this))
    this.router.use('/api/v1/private/article-article/:articleArticleId([0-9a-z-]+)/', this.onRequestFindArticleArticle.bind(this))
    this.router.get('/api/v1/private/article-article/:articleArticleId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivateArticleArticleEditInitialize.bind(this))
    this.router.put('/api/v1/private/article-article/:articleArticleId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivateArticleArticleEditValidate.bind(this))
    this.router.put('/api/v1/private/article-article/:articleArticleId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivateArticleArticleEditSubmit.bind(this))
    this.router.delete('/api/v1/private/article-article/:articleArticleId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivateArticleArticleDeleteSubmit.bind(this))

    this.router.get('/api/v1/private/serial/add/initialize', this.onRequestApiV1PrivateSerialAddInitialize.bind(this))
    this.router.post('/api/v1/private/serial/add/validate', this.onRequestApiV1PrivateSerialAddValidate.bind(this))
    this.router.post('/api/v1/private/serial/add/submit', this.onRequestApiV1PrivateSerialAddSubmit.bind(this))
    this.router.use('/api/v1/private/serial/:serialId([0-9a-z-]+)/', this.onRequestFindSerial.bind(this))
    this.router.get('/api/v1/private/serial/:serialId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivateSerialEditInitialize.bind(this))
    this.router.put('/api/v1/private/serial/:serialId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivateSerialEditValidate.bind(this))
    this.router.put('/api/v1/private/serial/:serialId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivateSerialEditSubmit.bind(this))
    this.router.delete('/api/v1/private/serial/:serialId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivateSerialDeleteSubmit.bind(this))
    this.router.use('/api/v1/private/serial/:serialId([0-9a-z-]+)/category/set/', this.onRequestFindCategorySerial.bind(this))
    this.router.get('/api/v1/private/serial/:serialId([0-9a-z-]+)/category/set/initialize', this.onRequestApiV1PrivateSerialCategorySetInitialize.bind(this))
    this.router.put('/api/v1/private/serial/:serialId([0-9a-z-]+)/category/set/validate', this.onRequestApiV1PrivateSerialCategorySetValidate.bind(this))
    this.router.put('/api/v1/private/serial/:serialId([0-9a-z-]+)/category/set/submit', this.onRequestApiV1PrivateSerialCategorySetSubmit.bind(this))
    this.router.use('/api/v1/private/serial/:serialId([0-9a-z-]+)/category/unset/', this.onRequestFindCategorySerial.bind(this))
    this.router.delete('/api/v1/private/serial/:serialId([0-9a-z-]+)/category/unset/submit', this.onRequestApiV1PrivateSerialCategoryUnsetSubmit.bind(this))

    this.router.get('/api/v1/private/category/add/initialize', this.onRequestApiV1PrivateCategoryAddInitialize.bind(this))
    this.router.post('/api/v1/private/category/add/validate', this.onRequestApiV1PrivateCategoryAddValidate.bind(this))
    this.router.post('/api/v1/private/category/add/submit', this.onRequestApiV1PrivateCategoryAddSubmit.bind(this))
    this.router.use('/api/v1/private/category/:categoryId([0-9a-z-]+)/', this.onRequestFindCategory.bind(this))
    this.router.get('/api/v1/private/category/:categoryId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivateCategoryEditInitialize.bind(this))
    this.router.put('/api/v1/private/category/:categoryId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivateCategoryEditValidate.bind(this))
    this.router.put('/api/v1/private/category/:categoryId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivateCategoryEditSubmit.bind(this))
    this.router.delete('/api/v1/private/category/:categoryId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivateCategoryDeleteSubmit.bind(this))

    this.router.get('/api/v1/private/topic/add/initialize', this.onRequestApiV1PrivateTopicAddInitialize.bind(this))
    this.router.post('/api/v1/private/topic/add/validate', this.onRequestApiV1PrivateTopicAddValidate.bind(this))
    this.router.post('/api/v1/private/topic/add/submit', this.onRequestApiV1PrivateTopicAddSubmit.bind(this))
    this.router.use('/api/v1/private/topic/:topicId([0-9a-z-]+)/', this.onRequestFindTopic.bind(this))
    this.router.get('/api/v1/private/topic/:topicId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivateTopicEditInitialize.bind(this))
    this.router.put('/api/v1/private/topic/:topicId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivateTopicEditValidate.bind(this))
    this.router.put('/api/v1/private/topic/:topicId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivateTopicEditSubmit.bind(this))
    this.router.delete('/api/v1/private/topic/:topicId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivateTopicDeleteSubmit.bind(this))

    this.router.get('/api/v1/private/topic-article/add/initialize', this.onRequestApiV1PrivateTopicArticleAddInitialize.bind(this))
    this.router.post('/api/v1/private/topic-article/add/validate', this.onRequestApiV1PrivateTopicArticleAddValidate.bind(this))
    this.router.post('/api/v1/private/topic-article/add/submit', this.onRequestApiV1PrivateTopicArticleAddSubmit.bind(this))
    this.router.use('/api/v1/private/topic-article/:topicArticleId([0-9a-z-]+)/', this.onRequestFindTopicArticle.bind(this))
    this.router.get('/api/v1/private/topic-article/:topicArticleId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivateTopicArticleEditInitialize.bind(this))
    this.router.put('/api/v1/private/topic-article/:topicArticleId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivateTopicArticleEditValidate.bind(this))
    this.router.put('/api/v1/private/topic-article/:topicArticleId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivateTopicArticleEditSubmit.bind(this))
    this.router.delete('/api/v1/private/topic-article/:topicArticleId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivateTopicArticleDeleteSubmit.bind(this))

    this.router.get('/api/v1/private/author/add/initialize', this.onRequestApiV1PrivateAuthorAddInitialize.bind(this))
    this.router.post('/api/v1/private/author/add/validate', this.onRequestApiV1PrivateAuthorAddValidate.bind(this))
    this.router.post('/api/v1/private/author/add/submit', this.onRequestApiV1PrivateAuthorAddSubmit.bind(this))
    this.router.use('/api/v1/private/author/:authorId([0-9a-z-]+)/', this.onRequestFindAuthor.bind(this))
    this.router.get('/api/v1/private/author/:authorId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivateAuthorEditInitialize.bind(this))
    this.router.put('/api/v1/private/author/:authorId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivateAuthorEditValidate.bind(this))
    this.router.put('/api/v1/private/author/:authorId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivateAuthorEditSubmit.bind(this))
    this.router.delete('/api/v1/private/author/:authorId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivateAuthorDeleteSubmit.bind(this))

    this.router.get('/api/v1/private/public-file/add/initialize', this.onRequestApiV1PrivatePublicFileAddInitialize.bind(this))
    this.router.post('/api/v1/private/public-file/add/validate', this.onRequestApiV1PrivatePublicFileAddValidate.bind(this))
    this.router.get('/api/v1/private/public-file/add/upload', this.onRequestApiV1PrivatePublicFileAddUpload.bind(this))
    this.router.post('/api/v1/private/public-file/add/submit', this.onRequestApiV1PrivatePublicFileAddSubmit.bind(this))
    this.router.use('/api/v1/private/public-file/:publicFileId([0-9a-z-]+)/', this.onRequestFindPublicFile.bind(this))
    this.router.get('/api/v1/private/public-file/:publicFileId([0-9a-z-]+)/view/initialize', this.onRequestPrivatePublicFileView.bind(this))
    this.router.get('/api/v1/private/public-file/:publicFileId([0-9a-z-]+)/view/initialize', this.onRequestApiV1PrivatePublicFileViewInitialize.bind(this))
    this.router.get('/api/v1/private/public-file/:publicFileId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivatePublicFileEditInitialize.bind(this))
    this.router.put('/api/v1/private/public-file/:publicFileId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivatePublicFileEditValidate.bind(this))
    this.router.get('/api/v1/private/public-file/:publicFileId([0-9a-z-]+)/edit/upload', this.onRequestApiV1PrivatePublicFileEditUpload.bind(this))
    this.router.put('/api/v1/private/public-file/:publicFileId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivatePublicFileEditSubmit.bind(this))
    this.router.delete('/api/v1/private/public-file/:publicFileId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivatePublicFileDeleteSubmit.bind(this))

    this.router.get('/api/v1/private/document/add/initialize', this.onRequestApiV1PrivateDocumentAddInitialize.bind(this))
    this.router.get('/api/v1/private/document/add/document-section', this.onRequestApiV1PrivateDocumentAddDocumentSection.bind(this))
    this.router.get('/api/v1/private/document/add/document-subsection', this.onRequestApiV1PrivateDocumentAddDocumentSubsection.bind(this))
    this.router.post('/api/v1/private/document/add/validate', this.onRequestApiV1PrivateDocumentAddValidate.bind(this))
    this.router.post('/api/v1/private/document/add/submit', this.onRequestApiV1PrivateDocumentAddSubmit.bind(this))
    this.router.use('/api/v1/private/document/:documentId([0-9a-z-]+)/', this.onRequestFindDocument.bind(this))
    this.router.get('/api/v1/private/document/:documentId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivateDocumentEditInitialize.bind(this))
    this.router.get('/api/v1/private/document/:documentId([0-9a-z-]+)/edit/document-section', this.onRequestApiV1PrivateDocumentEditDocumentSection.bind(this))
    this.router.get('/api/v1/private/document/:documentId([0-9a-z-]+)/edit/document-subsection', this.onRequestApiV1PrivateDocumentEditDocumentSubsection.bind(this))
    this.router.put('/api/v1/private/document/:documentId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivateDocumentEditValidate.bind(this))
    this.router.put('/api/v1/private/document/:documentId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivateDocumentEditSubmit.bind(this))
    this.router.delete('/api/v1/private/document/:documentId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivateDocumentDeleteSubmit.bind(this))

    this.router.get('/api/v1/private/document-article/add/initialize', this.onRequestApiV1PrivateDocumentArticleAddInitialize.bind(this))
    this.router.post('/api/v1/private/document-article/add/validate', this.onRequestApiV1PrivateDocumentArticleAddValidate.bind(this))
    this.router.post('/api/v1/private/document-article/add/submit', this.onRequestApiV1PrivateDocumentArticleAddSubmit.bind(this))
    this.router.use('/api/v1/private/document-article/:documentArticleId([0-9a-z-]+)/', this.onRequestFindDocumentArticle.bind(this))
    this.router.get('/api/v1/private/document-article/:documentArticleId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivateDocumentArticleEditInitialize.bind(this))
    this.router.put('/api/v1/private/document-article/:documentArticleId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivateDocumentArticleEditValidate.bind(this))
    this.router.put('/api/v1/private/document-article/:documentArticleId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivateDocumentArticleEditSubmit.bind(this))
    this.router.delete('/api/v1/private/document-article/:documentArticleId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivateDocumentArticleDeleteSubmit.bind(this))

    this.router.get('/api/v1/private/private-file/add/initialize', this.onRequestApiV1PrivatePrivateFileAddInitialize.bind(this))
    this.router.post('/api/v1/private/private-file/add/validate', this.onRequestApiV1PrivatePrivateFileAddValidate.bind(this))
    this.router.get('/api/v1/private/private-file/add/upload', this.onRequestApiV1PrivatePrivateFileAddUpload.bind(this))
    this.router.post('/api/v1/private/private-file/add/submit', this.onRequestApiV1PrivatePrivateFileAddSubmit.bind(this))
    this.router.use('/api/v1/private/private-file/:privateFileId([0-9a-z-]+)/', this.onRequestFindPrivateFile.bind(this))
    this.router.get('/api/v1/private/private-file/:privateFileId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivatePrivateFileEditInitialize.bind(this))
    this.router.put('/api/v1/private/private-file/:privateFileId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivatePrivateFileEditValidate.bind(this))
    this.router.get('/api/v1/private/private-file/:privateFileId([0-9a-z-]+)/edit/upload', this.onRequestApiV1PrivatePrivateFileEditUpload.bind(this))
    this.router.put('/api/v1/private/private-file/:privateFileId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivatePrivateFileEditSubmit.bind(this))
    this.router.delete('/api/v1/private/private-file/:privateFileId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivatePrivateFileDeleteSubmit.bind(this))

    this.router.use('/api/v1/private/request/:requestId([0-9a-z-]+)/', this.onRequestFindRequest.bind(this))
    this.router.delete('/api/v1/private/request/:requestId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivateRequestDeleteSubmit.bind(this))

    this.router.use('/api/v1/private/unsubscribe/:unsubscribeId([0-9a-z-]+)/', this.onRequestFindUnsubscribe.bind(this))
    this.router.delete('/api/v1/private/unsubscribe/:unsubscribeId([0-9a-z-]+)/delete/submit', this.onRequestApiV1PrivateUnsubscribeDeleteSubmit.bind(this))

    this.router.use('/api/v1/private/email-template/:emailTemplateId([0-9a-z-]+)/', this.onRequestFindEmailTemplate.bind(this))
    this.router.get('/api/v1/private/email-template/:emailTemplateId([0-9a-z-]+)/edit/initialize', this.onRequestApiV1PrivateEmailTemplateEditInitialize.bind(this))
    this.router.put('/api/v1/private/email-template/:emailTemplateId([0-9a-z-]+)/edit/validate', this.onRequestApiV1PrivateEmailTemplateEditValidate.bind(this))
    this.router.put('/api/v1/private/email-template/:emailTemplateId([0-9a-z-]+)/edit/submit', this.onRequestApiV1PrivateEmailTemplateEditSubmit.bind(this))

    this.router.use(this.onRequestNotFound.bind(this))
    this.router.use(this.onRequestInternalServerError.bind(this))
  }

  onListening () {
    winston.loggers.get('info').info(`Listening on ${process.env.PORT}`)
  }

  onRequest (req, res) {
    this.router(req, res)
  }

  async onRequestInitialize (req, res, next) {
    try {
      req.locals = {}
      res.locals.layout = {
        env: process.env,
        req: req,
        url: new URL(req.originalUrl, process.env.BASE_URL),
      }

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestAuthorize (req, res, next) {
    try {
      if (!req.oidc.user.email_verified) {
        res.redirect('/public/iam/signin/unauthorized/')
        return
      }

      const user = await model.user.findOne({
        where: {
          email: {[Op.eq]: req.oidc.user.email},
        },
      })

      if (!user) {
        res.redirect('/public/iam/signin/unauthorized/')
        return
      }

      req.locals.user = user
      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestAuthorizeApi (req, res, next) {
    try {
      if (!req.oidc.user) {
        res.status(401).end()
        return
      }

      if (!req.oidc.user.email_verified) {
        res.status(401).end()
        return
      }

      const user = await model.user.findOne({
        where: {
          email: {[Op.eq]: req.oidc.user.email},
        },
      })

      if (!user) {
        res.status(401).end()
        return
      }

      req.locals.user = user
      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestFindArticle (req, res, next) {
    await this.findById(req, res, next, 'article')
  }

  async onRequestFindSerialArticle (req, res, next) {
    try {
      const serialArticle = await model.serialArticle.findOne({
        where: {
          articleId: {[Op.eq]: req.params.articleId},
        },
      })

      req.locals.serialArticle = serialArticle || null

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestFindArticleDocument (req, res, next) {
    try {
      const articleDocument = await model.articleDocument.findOne({
        where: {
          articleId: {[Op.eq]: req.params.articleId},
        },
      })

      req.locals.articleDocument = articleDocument || null

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestFindAuthorArticle (req, res, next) {
    try {
      const authorArticle = await model.authorArticle.findOne({
        where: {
          articleId: {[Op.eq]: req.params.articleId},
        },
      })

      req.locals.authorArticle = authorArticle || null

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestFindArticleArticle (req, res, next) {
    await this.findById(req, res, next, 'articleArticle')
  }

  async onRequestFindSerial (req, res, next) {
    await this.findById(req, res, next, 'serial')
  }

  async onRequestFindCategorySerial (req, res, next) {
    try {
      const categorySerial = await model.categorySerial.findOne({
        where: {
          serialId: {[Op.eq]: req.params.serialId},
        },
      })

      req.locals.categorySerial = categorySerial || null

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestFindCategory (req, res, next) {
    await this.findById(req, res, next, 'category')
  }

  async onRequestFindTopic (req, res, next) {
    await this.findById(req, res, next, 'topic')
  }

  async onRequestFindTopicArticle (req, res, next) {
    await this.findById(req, res, next, 'topicArticle')
  }

  async onRequestFindAuthor (req, res, next) {
    await this.findById(req, res, next, 'author')
  }

  async onRequestFindPublicFile (req, res, next) {
    await this.findById(req, res, next, 'publicFile')
  }

  async onRequestFindDocument (req, res, next) {
    await this.findById(req, res, next, 'document')
  }

  async onRequestFindDocumentArticle (req, res, next) {
    await this.findById(req, res, next, 'documentArticle')
  }

  async onRequestFindPrivateFile (req, res, next) {
    await this.findById(req, res, next, 'privateFile')
  }

  async onRequestFindRequest (req, res, next) {
    await this.findById(req, res, next, 'request')
  }

  async onRequestFindUnsubscribe (req, res, next) {
    await this.findById(req, res, next, 'unsubscribe')
  }

  async onRequestFindEmailTemplate (req, res, next) {
    await this.findById(req, res, next, 'emailTemplate')
  }

  async onRequestFindEmail (req, res, next) {
    await this.findById(req, res, next, 'email')
  }

  async findById(req, res, next, key) {
    try {
      const row = await model[key].findOne({
        where: {
          id: {[Op.eq]: req.params[key + 'Id']},
        },
      })

      if (!row) {
        res.status(404).end()
        return
      }

      req.locals[key] = row

      next()
    } catch (err) {
      next(err)
    }    
  }

  getLimit (limit) {
    if (limit === 0) {
      return 0
    } else if (!limit) {
      return 20
    } else {
      return Math.min(Math.max(0, parseInt(limit, 10)), 100)
    }
  }

  async onRequestPrivateArticleIndex (req, res, next) {
    try {
      const {keyword, page, code} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = 'blogArticle as article'
      const where = [
        '1 = 1',
        ...pieces.map(_ => {
          return '(' + [
            'article.code like ?',
            'article.title like ?',
          ].join(' or ') + ')'
        }),
        ...(code ? ['article.code = ?'] : [])
      ].join(' and ')

      const replacements = [
        ...pieces.reduce((memo, piece) => {
          return memo.concat([
            `%${piece}%`,
            `%${piece}%`,
          ])
        }, []),
        ...(code ? [code] : [])
      ]

      const limit = this.getLimit(req.query.limit)
      const offset = limit * (current - 1)
      const sql = `
        select
          article.id as id,
          article.code as code,
          article.title as title
        from ${from}
        where ${where}
        order by article.date asc
        limit ? offset ?
      `

      const articles = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: replacements.concat([limit, offset]),
      })

      const accept = req.accepts(['json', 'html'])

      if (req.query.accept === 'json' || accept === 'json') {
        res.send({articles})
        return
      }

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)
      

      res.locals.articles = articles
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async findArticleSections (article) {
    return await model.articleSection.findAll({
      where: {
        articleId: {[Op.eq]: article.id},
      },
      sort: [['sort', 'asc']],
    })
  }

  async onRequestPrivateArticleView (req, res, next) {
    try {
      const {article} = req.locals

      const serialArticle = await model.serialArticle.findOne({
        where: {
          articleId: {[Op.eq]: article.id},
        },
        include: [{model: model.serial, as: 'serial'}],
      })

      const articleDocument = await model.articleDocument.findOne({
        where: {
          articleId: {[Op.eq]: article.id},
        },
        include: [{model: model.document, as: 'document'}],
      })

      const authorArticle = await model.authorArticle.findOne({
        where: {
          articleId: {[Op.eq]: article.id},
        },
        include: [{model: model.author, as: 'author'}],
      })

      const articleSections = await this.findArticleSections(article)

      const articleArticlesTo = await model.articleArticle.findAll({
        where: {
          articleFromId: {[Op.eq]: article.id},
        },
        order: [['sort', 'asc']],
        include: [
          {
            model: model.article,
            attributes: ['id', 'title'],
            as: 'articleTo',
          },
        ],
      })

      const articleArticlesFrom = (await model.articleArticle.findAll({
          where: {
            articleToId: {[Op.eq]: article.id},
          },
          include: [
            {
              model: model.article,
              attributes: ['id', 'title'],
              as: 'articleFrom',
            },
          ],
        }))
        .sort((a, b) => {
          return a.articleFrom.date - b.articleFrom.date
        })

      const documentArticles = (await model.documentArticle.findAll({
          where: {
            articleId: {[Op.eq]: article.id},
          },
          include: [{model: model.document, as: 'document'}],
        }))
        .sort((a, b) => {
          return new Date(a.document.date) - new Date(b.document.date)
        })

      const topicArticles = (await model.topicArticle.findAll({
          where: {
            articleId: {[Op.eq]: article.id},
          },
          include: [{model: model.topic, as: 'topic'}],
          order: [['sort', 'asc']],
        }))

      res.locals.article = await this.converter.convertArticle(req.locals.article)
      res.locals.serialArticle = serialArticle
      res.locals.articleDocument = articleDocument
      res.locals.authorArticle = authorArticle
      res.locals.articleSections = articleSections
      res.locals.articleArticlesTo = articleArticlesTo
      res.locals.articleArticlesFrom = articleArticlesFrom
      res.locals.documentArticles = documentArticles
      res.locals.topicArticles = topicArticles

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateArticleArticleIndex (req, res, next) {
    try {
      const {keyword, page, articleFromCode} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = `
        blogArticleArticle as articleArticle
        inner join blogArticle as articleFrom on articleFrom.id = articleArticle.articleFromId
        inner join blogArticle as articleTo on articleTo.id = articleArticle.articleToId
      `

      const where = [
        '1 = 1',
        ...pieces.map(_ => {
          return '(' + [
            'articleFrom.code like ?',
            'articleFrom.title like ?',
            'articleTo.code like ?',
            'articleTo.title like ?',
          ].join(' or ') + ')'
        }),
        ...(articleFromCode ? ['articleFrom.code = ?'] : []),
      ].join(' and ')

      const replacements = [
        ...pieces.reduce((memo, piece) => {
          return memo.concat([
            `%${piece}%`,
            `%${piece}%`,
            `%${piece}%`,
            `%${piece}%`,
          ])
        }, []),
        ...(articleFromCode ? [articleFromCode] : []),
      ]

      const limit = this.getLimit(req.query.limit)
      const offset = limit * (current - 1)
      const sql = `
        select
          articleArticle.id as articleArticleId,
          articleFrom.id as articleFromId,
          articleFrom.title as articleFromTitle,
          articleFrom.code as articleFromCode,
          articleTo.id as articleToId,
          articleTo.title as articleToTitle,
          articleTo.code as articleToCode
        from ${from}
        where ${where}
        order by articleFrom.id asc, articleArticle.sort asc
        limit ? offset ?
      `

      const rows = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: replacements.concat([limit, offset]),
      })

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const articleArticles = rows.map(row => ({
        id: row.articleArticleId,
        articleFrom: {
          id: row.articleFromId,
          code: row.articleFromCode,
          title: row.articleFromTitle,
        },
        articleTo: {
          id: row.articleToId,
          code: row.articleToCode,
          title: row.articleToTitle,
        },
      }))

      const accept = req.accepts(['json', 'html'])

      if (req.query.accept === 'json' || accept === 'json') {
        res.send({articleArticles})
        return
      }

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.articleArticles = articleArticles
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateArticleArticleView (req, res, next) {
    try {
      const {articleArticle} = req.locals
      const articleFrom = await model.article.findOne({
        where: {
          id: {[Op.eq]: articleArticle.articleFromId},
        },
      })

      const articleTo = await model.article.findOne({
        where: {
          id: {[Op.eq]: articleArticle.articleToId},
        },
      })

      res.locals.articleArticle = articleArticle
      res.locals.articleFrom = articleFrom
      res.locals.articleTo = articleTo

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateSerialIndex (req, res, next) {
    try {
      const {keyword, page, code} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = 'blogSerial as serial'
      const where = [
        '1 = 1',
        ...pieces.map(_ => {
          return '(' + [
            'serial.code like ?',
            'serial.title like ?',
          ].join(' or ') + ')'
        }),
        ...(code ? ['serial.code = ?'] : []),
      ].join(' and ')

      const replacements = [
        ...pieces.reduce((memo, piece) => {
          return memo.concat([
            `%${piece}%`,
            `%${piece}%`,
          ])
        }, []),
        ...(code ? [code] : []),
      ]

      const limit = this.getLimit(req.query.limit)
      const offset = limit * (current - 1)
      const sql = `
        select
          serial.id as id,
          serial.code as code,
          serial.title as title
        from ${from}
        where ${where}
        order by serial.createdAt asc, serial.id asc
        limit ? offset ?
      `

      const serials = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: replacements.concat([limit, offset]),
      })

      const accept = req.accepts(['json', 'html'])

      if (req.query.accept === 'json' || accept === 'json') {
        res.send({serials})
        return
      }

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.serials = serials
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateSerialView (req, res, next) {
    try {
      const {serial} = req.locals
      const categorySerial = await model.categorySerial.findOne({
        where: {
          serialId: {[Op.eq]: serial.id},
        },
        include: [{model: model.category, as: 'category'}],
      })

      const category = categorySerial && categorySerial.category
      const articles = (await model.serialArticle.findAll({
          where: {
            serialId: {[Op.eq]: serial.id},
          },
          include: [{model: model.article, as: 'article'}],
          order: [['sort', 'asc']],
        }))
        .map(serialArticle => serialArticle.article)

      res.locals.serial = this.converter.convertSerial(serial)
      res.locals.category = category
      res.locals.articles = articles

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateCategoryIndex (req, res, next) {
    try {
      const {keyword, page, code} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = 'blogCategory as category'
      const where = [
        '1 = 1',
        ...pieces.map(_ => {
          return '(' + [
            'category.code like ?',
            'category.title like ?',
          ].join(' or ') + ')'
        }),
        ...(code ? ['category.code = ?'] : []),
      ].join(' and ')

      const replacements = [
        ...pieces.reduce((memo, piece) => {
          return memo.concat([
            `%${piece}%`,
            `%${piece}%`,
          ])
        }, []),
        ...(code ? [code] : []),
      ]

      const limit = this.getLimit(req.query.limit)
      const offset = limit * (current - 1)
      const sql = `
        select
          category.id as id,
          category.code as code,
          category.title as title
        from ${from}
        where ${where}
        order by category.sort asc, category.id asc
        limit ?, ?
      `

      const categories = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: replacements.concat([offset, limit]),
      })

      const accept = req.accepts(['json', 'html'])

      if (req.query.accept === 'json' || accept === 'json') {
        res.send({categories})
        return
      }

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.categories = categories
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateCategoryView (req, res, next) {
    try {
      const {category} = req.locals
      const serials = (await model.categorySerial.findAll({
          where: {
            categoryId: {[Op.eq]: category.id},
          },
          include: [{model: model.serial, as: 'serial'}],
          order: [['sort', 'asc']],
        }))
        .map(categorySerial => categorySerial.serial)

      res.locals.category = category
      res.locals.serials = serials

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateTopicIndex (req, res, next) {
    try {
      const {keyword, page, code} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = 'blogTopic as topic'
      const where = [
        '1 = 1',
        ...pieces.map(_ => {
          return '(' + [
            'topic.code like ?',
            'topic.title like ?',
          ].join(' or ') + ')'
        }),
        ...(code ? ['topic.code = ?'] : [])
      ].join(' and ')

      const replacements = [
        ...pieces.reduce((memo, piece) => {
          return memo.concat([
            `%${piece}%`,
            `%${piece}%`,
          ])
        }, []),
        ...(code ? [code] : []),
      ]

      const limit = this.getLimit(req.query.limit)
      const offset = limit * (current - 1)
      const sql = `
        select
          topic.id as id,
          topic.code as code,
          topic.title as title
        from ${from}
        where ${where}
        order by topic.sort asc, topic.id asc
        limit ? offset ?
      `

      const topics = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: replacements.concat([limit, offset]),
      })

      const accept = req.accepts(['json', 'html'])

      if (req.query.accept === 'json' || accept === 'json') {
        res.send({topics})
        return
      }

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.topics = topics
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateTopicView (req, res, next) {
    try {
      const {topic} = req.locals
      const sql = `
        select
          article.id as id,
          article.title as title
        from blogArticle as article
        inner join blogTopicArticle as topicArticle on topicArticle.articleId = article.id
        where topicArticle.topicId = ?
        order by article.date asc, article.id asc
      `

      const articles = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: [topic.id],
      })

      res.locals.topic = topic
      res.locals.articles = articles

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateTopicArticleIndex (req, res, next) {
    try {
      const {keyword, page, articleCode} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = `blogTopicArticle as topicArticle
        inner join blogTopic as topic on topic.id = topicArticle.topicId
        inner join blogArticle as article on article.id = topicArticle.articleId
      `

      const where = [
        '1 = 1',
        ...pieces.map(_ => {
          return '(' + [
            'topic.code like ?',
            'topic.title like ?',
            'article.code like ?',
            'article.title like ?',
          ].join(' or ') + ')'
        }),
        ...(articleCode ? ['article.code = ?'] : []),
      ].join(' and ')

      const replacements = [
        ...pieces.reduce((memo, piece) => {
          return memo.concat([
            `%${piece}%`,
            `%${piece}%`,
            `%${piece}%`,
            `%${piece}%`,
          ])
        }, []),
        ...(articleCode ? [articleCode] : []),
      ]

      const limit = this.getLimit(req.query.limit)
      const offset = limit * (current - 1)
      const sql = `
        select
          topicArticle.id as topicArticleId,
          topic.id as topicId,
          topic.code as topicCode,
          topic.title as topicTitle,
          article.id as articleId,
          article.code as articleCode,
          article.title as articleTitle
        from ${from}
        where ${where}
        order by article.date asc, topicArticle.sort asc, topicArticle.id asc
        limit ?, ?
      `

      const topicArticles = (await model.sequelize.query(sql, {
          type: QueryTypes.SELECT,
          replacements: replacements.concat([offset, limit]),
        }))
        .map(row => ({
          id: row.topicArticleId,
          topic: {
            id: row.topicId,
            code: row.topicCode,
            title: row.topicTitle,
          },
          article: {
            id: row.articleId,
            code: row.articleCode,
            title: row.articleTitle,
          },
        }))

      const accept = req.accepts(['json', 'html'])

      if (req.query.accept === 'json' || accept === 'json') {
        res.send({topicArticles})
        return
      }

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.topicArticles = topicArticles
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateTopicArticleView (req, res, next) {
    try {
      const {topicArticle} = req.locals
      const topic = await model.topic.findOne({
        where: {
          id: {[Op.eq]: topicArticle.topicId},
        },
      })

      const article = await model.article.findOne({
        where: {
          id: {[Op.eq]: topicArticle.articleId},
        },
      })

      res.locals.topicArticle = topicArticle
      res.locals.topic = topic
      res.locals.article = article

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateAuthorIndex (req, res, next) {
    try {
      const {keyword, page, code} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = 'blogAuthor as author'
      const where = [
        '1 = 1',
        ...pieces.map(_ => {
          return '(' + [
            'author.code like ?',
            'author.name like ?',
            'author.kana like ?',
            'author.roman like ?',
          ].join(' or ') + ')'
        }),
        ...(code ? ['author.code = ?'] : []),
      ].join(' and ')

      const replacements = [
        ...pieces.reduce((memo, piece) => {
          return memo.concat([
            `%${piece}%`,
            `%${piece}%`,
            `%${piece}%`,
            `%${piece}%`,
          ])
        }, []),
        ...(code ? [code] : []),
      ]

      const limit = this.getLimit(req.query.limit)
      const offset = limit * (current - 1)
      const sql = `
        select
          author.id as id,
          author.code as code,
          author.name as name
        from ${from}
        where ${where}
        order by author.kana asc, author.id asc
        limit ? offset ?
      `

      const authors = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: replacements.concat([limit, offset]),
      })

      const accept = req.accepts(['json', 'html'])

      if (req.query.accept === 'json' || accept === 'json') {
        res.send({authors})
        return
      }

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.authors = authors
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateAuthorView (req, res, next) {
    try {
      const {author} = req.locals

      const sql = `
        select
          article.id as id,
          article.title as title
        from blogArticle as article
        inner join authorArticle on authorArticle.articleId = article.id
        where authorArticle.authorId = ?
        order by article.date asc, article.id asc
      `

      const articles = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: [author.id],
      })

      res.locals.author = this.converter.convertAuthor(author)
      res.locals.articles = articles

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivatePublicFileIndex (req, res, next) {
    try {
      const {keyword, page, code} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = 'blogPublicFile as publicFile'
      const where = [
        '1 = 1',
        ...pieces.map(_ => {
          return '(' + [
            'publicFile.code like ?',
            'publicFile.title like ?',
          ].join(' or ') + ')'
        }),
        ...(code ? ['publicFile.code = ?'] : []),
      ].join(' and ')

      const replacements = [
        ...pieces.reduce((memo, piece) => {
          return memo.concat([
            `%${piece}%`,
            `%${piece}%`,
          ])
        }, []),
        ...(code ? [code] : []),
      ]

      const limit = this.getLimit(req.query.limit)
      const offset = limit * (current - 1)
      const sql = `
        select
          publicFile.id as id,
          publicFile.code as code,
          publicFile.title as title
        from ${from}
        where ${where}
        order by publicFile.code asc
        limit ? offset ?
      `

      const publicFiles = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: replacements.concat([limit, offset]),
      })

      const accept = req.accepts(['json', 'html'])

      if (req.query.accept === 'json' || accept === 'json') {
        res.send({publicFiles})
        return
      }

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.publicFiles = publicFiles
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivatePublicFileView (req, res, next) {
    try {
      res.locals.publicFile = await this.converter.convertPublicFile(req.locals.publicFile)

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateDocumentIndex (req, res, next) {
    try {
      const {keyword, page, code} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = 'blogDocument as document'
      const where = [
        '1 = 1',
        ...pieces.map(_ => {
          return '(' + [
            'document.code like ?',
            'document.title like ?',
          ].join(' or ') + ')'
        }),
        ...(code ? ['document.code = ?'] : []),
      ].join(' and ')

      const replacements = [
        ...pieces.reduce((memo, piece) => {
          return memo.concat([
            `%${piece}%`,
            `%${piece}%`,
          ])
        }, []),
        ...(code ? [code] : []),
      ]

      const limit = this.getLimit(req.query.limit)
      const offset = limit * (current - 1)
      const sql = `
        select
          document.id as id,
          document.code as code,
          document.title as title
        from ${from}
        where ${where}
        order by document.date asc
        limit ? offset ?
      `

      const documents = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: replacements.concat([limit, offset]),
      })

      const accept = req.accepts(['json', 'html'])

      if (req.query.accept === 'json' || accept === 'json') {
        res.send({documents})
        return
      }

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.documents = documents
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateDocumentView (req, res, next) {
    try {
      const {document} = req.locals
      const documentArticles = await model.documentArticle.findAll({
        where: {
          documentId: {[Op.eq]: document.id},
        },
        order: [['sort', 'asc']],
        include: [
          {
            model: model.article,
            as: 'article',
            attributes: ['id', 'title'],
          },
        ],
      })

      const articleDocuments = (await model.articleDocument.findAll({
          where: {
            documentId: {[Op.eq]: document.id},
          },
          include: [
            {
              model: model.article,
              as: 'article',
              attributes: ['id', 'title'],
            },
          ],
        }))
        .sort((a, b) => {
          return new Date(a.article.date) - new Date(b.article.date)
        })

      const documentSections = await this.findDocumentSections(document)

      res.locals.document = await this.converter.convertDocument(req.locals.document)
      res.locals.documentArticles = documentArticles
      res.locals.articleDocuments = articleDocuments
      res.locals.documentSections = documentSections

      next()
    } catch (err) {
      next(err)
    }
  }

  async findDocumentSections (document) {
     const sql = `
        select
          documentSection.id as documentSectionId,
          documentSection.title as documentSectionTitle,
          documentSubsection.id as documentSubsectionId,
          documentSubsection.title as documentSubsectionTitle
        from blogDocumentSection as documentSection
        left outer join blogDocumentSubsection as documentSubsection on documentSubsection.documentSectionId = documentSection.id
        where documentSection.documentId = ?
        order by documentSection.sort asc, documentSection.id asc, documentSubsection.sort asc
      `

      const rows = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: [document.id],
      })

      return this.partitionBy(row => row.documentSectionId, rows)
        .map(rows => ({
          id: rows[0].documentSectionId,
          title: rows[0].documentSectionTitle,
          documentSubsections: rows[0].documentSubsectionId === null
            ? []
            : rows.map(row => ({
              id: row.documentSubsectionId,
              title: row.documentSubsectionTitle,
            }))
        }))
  }

  async onRequestPrivateDocumentArticleIndex (req, res, next) {
    try {
      const {keyword, page, documentCode, articleCode} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = `blogDocumentArticle as documentArticle
        inner join blogDocument as document on document.id = documentArticle.documentId
        inner join blogArticle as article on article.id = documentArticle.articleId
      `

      const where = [
        '1 = 1',
        ...pieces.map(_ => {
          return '(' + [
            'document.code like ?',
            'document.title like ?',
            'article.code like ?',
            'article.title like ?',
          ].join(' or ') + ')'
        }),
        ...(documentCode ? ['document.code = ?'] : []),
        ...(articleCode ? ['article.code = ?'] : []),
      ].join(' and ')


      const replacements = [
        ...pieces.reduce((memo, piece) => {
          return memo.concat([
            `%${piece}%`,
            `%${piece}%`,
            `%${piece}%`,
            `%${piece}%`,
          ])
        }, []),
        ...(documentCode ? [documentCode] : []),
        ...(articleCode ? [articleCode] : []),
      ]

      const limit = this.getLimit(req.query.limit)
      const offset = limit * (current - 1)
      const sql = `
        select
          documentArticle.id as documentArticleId,
          document.id as documentId,
          document.code as documentCode,
          document.title as documentTitle,
          article.id as articleId,
          article.code as articleCode,
          article.title as articleTitle
        from ${from}
        where ${where}
        order by document.date asc, documentArticle.sort asc, documentArticle.id asc
        limit ? offset ?
      `

      const documentArticles = (await model.sequelize.query(sql, {
          type: QueryTypes.SELECT,
          replacements: replacements.concat([limit, offset]),
        }))
        .map(row => ({
          id: row.documentArticleId,
          document: {
            id: row.documentId,
            code: row.documentCode,
            title: row.documentTitle,
          },
          article: {
            id: row.articleId,
            code: row.articleCode,
            title: row.articleTitle,
          },
        }))

      const accept = req.accepts(['json', 'html'])

      if (req.query.accept === 'json' || accept === 'json') {
        res.send({documentArticles})
        return
      }

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.documentArticles = documentArticles
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateDocumentArticleView (req, res, next) {
    try {
      const {documentArticle} = req.locals
      const document = await model.document.findOne({
        where: {
          id: {[Op.eq]: documentArticle.documentId},
        },
      })

      const article = await model.article.findOne({
        where: {
          id: {[Op.eq]: documentArticle.articleId},
        },
      })

      res.locals.documentArticle = documentArticle
      res.locals.document = document
      res.locals.article = article

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivatePrivateFileIndex (req, res, next) {
    try {
      const {keyword, page, code} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = 'blogPrivateFile as privateFile'
      const where = [
        '1 = 1',
        ...pieces.map(_ => {
          return '(' + [
            'privateFile.code like ?',
            'privateFile.title like ?',
          ].join(' or ') + ')'
        }),
        ...(code ? ['privateFile.code = ?'] : []),
      ].join(' and ')

      const replacements = [
        ...pieces.reduce((memo, piece) => {
          return memo.concat([
            `%${piece}%`,
            `%${piece}%`,
          ])
        }, []),
        ...(code ? [code] : []),
      ]

      const limit = this.getLimit(req.query.limit)
      const offset = limit * (current - 1)
      const sql = `
        select
          privateFile.id as id,
          privateFile.code as code,
          privateFile.title as title
        from ${from}
        where ${where}
        order by privateFile.code asc
        limit ? offset ?
      `

      const privateFiles = await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: replacements.concat([limit, offset]),
      })

      const accept = req.accepts(['json', 'html'])

      if (req.query.accept === 'json' || accept === 'json') {
        res.send({privateFiles})
        return
      }

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.privateFiles = privateFiles
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivatePrivateFileView (req, res, next) {
    try {
      res.locals.privateFile = await this.converter.convertPrivateFile(req.locals.privateFile)

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateRequestIndex (req, res, next) {
    try {
      const {keyword, page} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = `blogRequest as request
        inner join blogRequestDocument as requestDocument on requestDocument.requestId = request.id
        inner join blogDocument as document on document.id = requestDocument.documentId`

      const where = '1 = 1' + pieces.map(_ => {
        return ' and (' + [
          'request.name like ?',
          'request.email like ?',
          'document.code like ?',
          'document.title like ?',
        ].join(' or ') + ')'
      }).join('')

      const replacements = pieces.reduce((memo, piece) => {
        return memo.concat([
          `%${piece}%`,
          `%${piece}%`,
          `%${piece}%`,
          `%${piece}%`,
        ])
      }, [])

      const limit = 20
      const offset = limit * (current - 1)
      const sql = `
        select
          request.id as requestId,
          request.date as requestDate,
          document.title as documentTitle
        from ${from}
        where ${where}
        order by request.date desc
        limit ?, ?
      `

      const requests = (await model.sequelize.query(sql, {
          type: QueryTypes.SELECT,
          replacements: replacements.concat([offset, limit]),
        }))
        .map(row => ({
          id: row.requestId,
          dateText: this.converter.convertDateTime(row.requestDate),
          document: {
            title: row.documentTitle,
          },
        }))

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.requests = requests
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateRequestView (req, res, next) {
    try {
      const {request} = req.locals
      const {document} = (await model.requestDocument.findOne({
        where: {
          requestId: {[Op.eq]: request.id},
        },
        include: [{model: model.document, as: 'document'}],
      }))

      res.locals.request = await this.converter.convertRequest(req.locals.request)
      res.locals.document = document

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateUnsubscribeIndex (req, res, next) {
    try {
      const {keyword, page} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = `blogUnsubscribe as unsubscribe`

      const where = '1 = 1' + pieces.map(_ => {
        return ' and (' + [
          'unsubscribe.email like ?',
        ].join(' or ') + ')'
      }).join('')

      const replacements = pieces.reduce((memo, piece) => {
        return memo.concat([
          `%${piece}%`,
        ])
      }, [])

      const limit = 20
      const offset = limit * (current - 1)
      const sql = `
        select
          unsubscribe.id as id,
          unsubscribe.date as date,
          unsubscribe.email as email
        from ${from}
        where ${where}
        order by unsubscribe.date desc
        limit ?, ?
      `

      const unsubscribes = (await model.sequelize.query(sql, {
          type: QueryTypes.SELECT,
          replacements: replacements.concat([offset, limit]),
        }))
        .map(row => ({
          id: row.id,
          date: row.date,
          dateText: this.converter.convertDateTime(row.date),
          email: row.email,
        }))

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.unsubscribes = unsubscribes
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateUnsubscribeView (req, res, next) {
    try {
      res.locals.unsubscribe = await this.converter.convertUnsubscribe(req.locals.unsubscribe)
      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateEmailTemplateIndex (req, res, next) {
    try {
      const emailTemplates = await model.emailTemplate.findAll({
        order: [['sort', 'asc']],
      })

      res.locals.emailTemplates = emailTemplates

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateEmailTemplateView (req, res, next) {
    try {
      res.locals.emailTemplate = await this.converter.convertEmailTemplate(req.locals.emailTemplate)
      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateEmailIndex (req, res, next) {
    try {
      const {keyword, page} = req.query
      const current = /^[0-9]+$/.test(page) ? parseInt(page, 10) : 1
      const pieces = keyword ? req.query.keyword.split(/[\s　]+/) : []
      const from = `blogEmail as email`

      const where = '1 = 1' + pieces.map(_ => {
        return ' and (' + [
          'email.fromName like ?',
          'email.fromEmail like ?',
          'email.toName like ?',
          'email.toEmail like ?',
          'email.subject like ?',
        ].join(' or ') + ')'
      }).join('')

      const replacements = pieces.reduce((memo, piece) => {
        return memo.concat([
          `%${piece}%`,
          `%${piece}%`,
          `%${piece}%`,
          `%${piece}%`,
          `%${piece}%`,
        ])
      }, [])

      const limit = 20
      const offset = limit * (current - 1)
      const sql = `
        select
          email.*
        from ${from}
        where ${where}
        order by email.date desc
        limit ?, ?
      `

      const emails = (await model.sequelize.query(sql, {
          type: QueryTypes.SELECT,
          replacements: replacements.concat([offset, limit]),
        }))
        .map(row => ({
          id: row.id,
          dateText: this.converter.convertDateTime(row.date),
          toName: row.toName,
          toEmail: row.toEmail,
          subject: row.subject,
        }))

      const sqlCount = `select count(*) as count from ${from} where ${where}`
      const [{count}] = await model.sequelize.query(sqlCount, {
        type: QueryTypes.SELECT,
        replacements: replacements,
      })

      const summary = this.paginator.makeSummary(count, limit, current)
      const pagination = this.paginator.makePagination(req.query, summary)

      res.locals.emails = emails
      res.locals.summary = summary
      res.locals.pagination = pagination

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestPrivateEmailView (req, res, next) {
    try {
      res.locals.email = await this.converter.convertEmail(req.locals.email)
      next()
    } catch (err) {
      next(err)
    }
  }

  makeArticleSection () {
    const form = this.initializer.makeFormArticleSection()
    const validation = this.validator.makeValidationArticleSection()

    return {form, validation}
  }

  async onRequestApiV1PrivateArticleAddInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormArticle()
      const validation = this.validator.makeValidationArticle()
      const articleSections = [this.makeArticleSection()]

      res.send({form, validation, articleSections})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleAddArticleSection (req, res, next) {
    try {
      res.send(this.makeArticleSection())
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleAddValidate (req, res, next) {
    try {
      res.send(await this.validateArticle(req))
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleAddSubmit (req, res, next) {
    try {
      const {ok} = await this.validateArticle(req)

      if (!ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {form} = req.body
        const article = await model.article.create({
          code: form.code,
          title: form.title,
          titleShort: form.titleShort,
          visual: form.visual,
          date: form.date,
          description: form.description,
          body: form.body,
          minute: form.minute,
          isPublished: this.converter.invertIsPublished(form.isPublished),
        }, {transaction})

        await this.createArticleSections(article, req.body.articleSections, transaction)

        const ok = true
        const redirect = './finish/?id=' + article.id

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormArticle()
      const validation = this.validator.makeValidationArticle()
      const {article} = req.locals

      form.code = '' + article.code
      form.title = '' + article.title
      form.titleShort = '' + article.titleShort
      form.visual = '' + article.visual
      form.date = '' + article.date
      form.description = '' + article.description
      form.body = '' + article.body
      form.minute = '' + article.minute
      form.isPublished = this.converter.convertIsPublished(article.isPublished)

      const articleSections = (await this.findArticleSections(article))
        .map(articleSection => {
          const {form, validation} = this.makeArticleSection()

          form.title = articleSection.title
          form.url = articleSection.url

          return {form, validation}
        })

      res.send({form, validation, articleSections})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleEditArticleSection (req, res, next) {
    try {
      res.send(this.makeArticleSection())
    } catch (err) {
      next(err)
    }
  }

  async validateArticle (req) {
    const validation = await this.validator.validateArticle(req)
    const articleSections = []

    for (const articleSection of req.body.articleSections) {
      const {form} = articleSection
      const validation = await this.validator.validateArticleSection(form)

      articleSections.push({validation})
    }

    const ok = validation.ok === true
      && articleSections.every(articleSection => {
        return articleSection.validation.ok === true
      })

    return {ok, validation, articleSections}
  }

  async onRequestApiV1PrivateArticleEditValidate (req, res, next) {
    try {
      res.send(await this.validateArticle(req))
    } catch (err) {
      next(err)
    }
  }

  async createArticleSections (article, articleSections, transaction) {
    for (const articleSection of articleSections) {
      await model.articleSection.create({
        sort: articleSections.indexOf(articleSection) + 1,
        title: articleSection.form.title,
        url: articleSection.form.url,
        articleId: article.id,
      }, {transaction})
    }
  }

  async onRequestApiV1PrivateArticleEditSubmit (req, res, next) {
    try {
      const {ok} = await this.validateArticle(req)

      if (!ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {article} = req.locals
        const {form} = req.body

        article.code = form.code
        article.title = form.title
        article.titleShort = form.titleShort
        article.visual = form.visual
        article.date = form.date
        article.description = form.description
        article.body = form.body
        article.minute = form.minute
        article.isPublished = this.converter.invertIsPublished(form.isPublished)

        await article.save({transaction})

        await model.articleSection.destroy({
          where: {
            articleId: {[Op.eq]: article.id},
          },
          transaction,
        })

        await this.createArticleSections(article, req.body.articleSections, transaction)

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        await req.locals.article.destroy({transaction})

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleSerialSetInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormArticleSerialSet()
      const validation = this.validator.makeValidationArticleSerialSet()
      const serials = await model.serial.findAll({
        order: [['code', 'asc']],
      })

      const options = {
        serialId: serials.map(serial => ({
          value: '' + serial.id,
          text: serial.title,
        }))
      }

      const {serialArticle} = req.locals

      if (serialArticle) {
        form.sort = '' + serialArticle.sort
        form.serialId = '' + serialArticle.serialId
      }

      res.send({form, validation, options})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleSerialSetValidate (req, res, next) {
    try {
      const validation = await this.validator.validateArticleSerialSet(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleSerialSetSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateArticleSerialSet(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {serialArticle} = req.locals
        const {form} = req.body

        if (serialArticle) {
          serialArticle.sort = form.sort
          serialArticle.serialId = form.serialId

          await serialArticle.save({transaction})
        } else {
          await model.serialArticle.create({
            sort: form.sort,
            serialId: form.serialId,
            articleId: req.locals.article.id,
          }, {transaction})
        }

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleSerialUnsetSubmit (req, res, next) {
    try {
      if (!req.locals.serialArticle) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        await req.locals.serialArticle.destroy({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleDocumentSetInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormArticleDocumentSet()
      const validation = this.validator.makeValidationArticleDocumentSet()
      const documents = await model.document.findAll({
        order: [['date', 'asc']],
      })

      const options = {
        documentId: documents.map(document => ({
          value: '' + document.id,
          text: document.title,
        }))
      }

      const {articleDocument} = req.locals

      if (articleDocument) {
        form.sort = '' + articleDocument.sort
        form.documentId = '' + articleDocument.documentId
      }

      res.send({form, validation, options})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleDocumentSetValidate (req, res, next) {
    try {
      const validation = await this.validator.validateArticleDocumentSet(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleDocumentSetSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateArticleDocumentSet(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {articleDocument} = req.locals
        const {form} = req.body

        if (articleDocument) {
          articleDocument.sort = form.sort
          articleDocument.documentId = form.documentId

          await articleDocument.save({transaction})
        } else {
          await model.articleDocument.create({
            sort: form.sort,
            documentId: form.documentId,
            articleId: req.locals.article.id,
          }, {transaction})
        }

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleDocumentUnsetSubmit (req, res, next) {
    try {
      if (!req.locals.articleDocument) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        await req.locals.articleDocument.destroy({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleAuthorSetInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormArticleAuthorSet()
      const validation = this.validator.makeValidationArticleAuthorSet()
      const authors = await model.author.findAll({
        order: [['kana', 'asc']],
      })

      const options = {
        authorId: authors.map(author => ({
          value: '' + author.id,
          text: author.name,
        }))
      }

      const {authorArticle} = req.locals

      if (authorArticle) {
        form.authorId = '' + authorArticle.authorId
      }

      res.send({form, validation, options})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleAuthorSetValidate (req, res, next) {
    try {
      const validation = await this.validator.validateArticleAuthorSet(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleAuthorSetSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateArticleAuthorSet(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {authorArticle} = req.locals
        const {form} = req.body

        if (authorArticle) {
          authorArticle.authorId = form.authorId

          await authorArticle.save({transaction})
        } else {
          await model.authorArticle.create({
            authorId: form.authorId,
            articleId: req.locals.article.id,
          }, {transaction})
        }

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleAuthorUnsetSubmit (req, res, next) {
    try {
      if (!req.locals.authorArticle) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        await req.locals.authorArticle.destroy({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async makeOptionsArticleArticle () {
    const articleIdOptions = (await model.article.findAll({
        order: [['date', 'asc']],
      }))
      .map(article => ({
        value: '' + article.id,
        text: article.title,
      }))

    return {
      articleFromId: articleIdOptions,
      articleToId: articleIdOptions,
    }
  }

  async onRequestApiV1PrivateArticleArticleAddInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormArticleArticle()
      const validation = this.validator.makeValidationArticleArticle()
      const options = await this.makeOptionsArticleArticle()
      const {articleArticle} = req.locals

      res.send({form, validation, options})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleArticleAddValidate (req, res, next) {
    try {
      const validation = await this.validator.validateArticleArticle(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleArticleAddSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateArticleArticle(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {form} = req.body
        const articleArticle = await model.articleArticle.create({
          sort: form.sort,
          articleFromId: form.articleFromId,
          articleToId: form.articleToId,
        }, {transaction})

        const ok = true
        const redirect = './finish/?id=' + articleArticle.id

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleArticleEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormArticleArticle()
      const validation = this.validator.makeValidationArticleArticle()
      const options = await this.makeOptionsArticleArticle()
      const {articleArticle} = req.locals

      form.sort = '' + articleArticle.sort
      form.articleFromId = '' + articleArticle.articleFromId
      form.articleToId = '' + articleArticle.articleToId

      res.send({form, validation, options})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleArticleEditValidate (req, res, next) {
    try {
      const validation = await this.validator.validateArticleArticle(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleArticleEditSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateArticleArticle(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {articleArticle} = req.locals
        const {form} = req.body

        articleArticle.sort = form.sort
        articleArticle.articleFromId = form.articleFromId
        articleArticle.articleToId = form.articleToId

        await articleArticle.save({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateArticleArticleDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        await req.locals.articleArticle.destroy({transaction})

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateSerialAddInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormSerial()
      const validation = this.validator.makeValidationSerial()

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateSerialAddValidate (req, res, next) {
    try {
      const validation = await this.validator.validateSerial(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateSerialAddSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateSerial(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {form} = req.body
        const serial = await model.serial.create({
          code: form.code,
          title: form.title,
          titleShort: form.titleShort,
          visual: form.visual,
          isPublished: this.converter.invertIsPublished(form.isPublished),
        }, {transaction})

        const ok = true
        const redirect = './finish/?id=' + serial.id

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateSerialEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormSerial()
      const validation = this.validator.makeValidationSerial()
      const {serial} = req.locals

      form.code = '' + serial.code
      form.title = '' + serial.title
      form.titleShort = '' + serial.titleShort
      form.visual = '' + serial.visual
      form.isPublished = this.converter.convertIsPublished(serial.isPublished)

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateSerialEditValidate (req, res, next) {
    try {
      const validation = await this.validator.validateSerial(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateSerialEditSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateSerial(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {serial} = req.locals
        const {form} = req.body

        serial.code = form.code
        serial.title = form.title
        serial.titleShort = form.titleShort
        serial.visual = form.visual
        serial.isPublished = this.converter.invertIsPublished(form.isPublished)

        await serial.save({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateSerialDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        await req.locals.serial.destroy({transaction})

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateSerialCategorySetInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormSerialCategorySet()
      const validation = this.validator.makeValidationSerialCategorySet()
      const categories = await model.category.findAll({
        order: [['sort', 'asc']],
      })

      const options = {
        categoryId: categories.map(category => ({
          value: '' + category.id,
          text: category.title,
        }))
      }

      const {categorySerial} = req.locals

      if (categorySerial) {
        form.sort = '' + categorySerial.sort
        form.categoryId = '' + categorySerial.categoryId
      }

      res.send({form, validation, options})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateSerialCategorySetValidate (req, res, next) {
    try {
      const validation = await this.validator.validateSerialCategorySet(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateSerialCategorySetSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateSerialCategorySet(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {categorySerial} = req.locals
        const {form} = req.body

        if (categorySerial) {
          categorySerial.sort = form.sort
          categorySerial.categoryId = form.categoryId

          await categorySerial.save({transaction})
        } else {
          await model.categorySerial.create({
            sort: form.sort,
            categoryId: form.categoryId,
            serialId: req.locals.serial.id,
          }, {transaction})
        }

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateSerialCategoryUnsetSubmit (req, res, next) {
    try {
      if (!req.locals.categorySerial) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        await req.locals.categorySerial.destroy({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateCategoryAddInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormCategory()
      const validation = this.validator.makeValidationCategory()

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateCategoryAddValidate (req, res, next) {
    try {
      const validation = await this.validator.validateCategory(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateCategoryAddSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateCategory(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {form} = req.body
        const category = await model.category.create({
          sort: form.sort,
          code: form.code,
          title: form.title,
        }, {transaction})

        const ok = true
        const redirect = './finish/?id=' + category.id

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateCategoryEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormCategory()
      const validation = this.validator.makeValidationCategory()
      const {category} = req.locals

      form.sort = '' + category.sort
      form.code = '' + category.code
      form.title = '' + category.title

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateCategoryEditValidate (req, res, next) {
    try {
      const validation = await this.validator.validateCategory(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateCategoryEditSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateCategory(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {category} = req.locals
        const {form} = req.body

        category.sort = form.sort
        category.code = form.code
        category.title = form.title

        await category.save({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateCategoryDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        await req.locals.category.destroy({transaction})

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicAddInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormTopic()
      const validation = this.validator.makeValidationTopic()

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicAddValidate (req, res, next) {
    try {
      const validation = await this.validator.validateTopic(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicAddSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateTopic(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {form} = req.body
        const topic = await model.topic.create({
          sort: form.sort,
          code: form.code,
          title: form.title,
        }, {transaction})

        const ok = true
        const redirect = './finish/?id=' + topic.id

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormTopic()
      const validation = this.validator.makeValidationTopic()
      const {topic} = req.locals

      form.sort = '' + topic.sort
      form.code = '' + topic.code
      form.title = '' + topic.title

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicEditValidate (req, res, next) {
    try {
      const validation = await this.validator.validateTopic(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicEditSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateTopic(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {topic} = req.locals
        const {form} = req.body

        topic.sort = form.sort
        topic.code = form.code
        topic.title = form.title

        await topic.save({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        await req.locals.topic.destroy({transaction})

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async makeOptionsTopicArticle () {
    const topics = await model.topic.findAll({
      order: [['sort', 'asc'], ['id', 'asc']],
    })

    const articles = await model.article.findAll({
      order: [['date', 'asc'], ['id', 'asc']],
    })

    return {
      topicId: topics.map(topic => ({
        value: '' + topic.id,
        text: '' + topic.title,
      })),
      articleId: articles.map(article => ({
        value: '' + article.id,
        text: '' + article.title,
      })),
    }
  }

  async onRequestApiV1PrivateTopicArticleAddInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormTopicArticle()
      const validation = this.validator.makeValidationTopicArticle()
      const options = await this.makeOptionsTopicArticle()

      res.send({form, validation, options})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicArticleAddValidate (req, res, next) {
    try {
      const validation = await this.validator.validateTopicArticle(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicArticleAddSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateTopicArticle(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {form} = req.body
        const topicArticle = await model.topicArticle.create({
          sort: form.sort,
          topicId: form.topicId,
          articleId: form.articleId,
        }, {transaction})

        const ok = true
        const redirect = './finish/?id=' + topicArticle.id

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicArticleEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormTopicArticle()
      const validation = this.validator.makeValidationTopicArticle()
      const options = await this.makeOptionsTopicArticle()
      const {topicArticle} = req.locals

      form.sort = '' + topicArticle.sort
      form.topicId = '' + topicArticle.topicId
      form.articleId = '' + topicArticle.articleId

      res.send({form, validation, options})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicArticleEditValidate (req, res, next) {
    try {
      const validation = await this.validator.validateTopicArticle(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicArticleEditSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateTopicArticle(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {topicArticle} = req.locals
        const {form} = req.body

        topicArticle.sort = form.sort
        topicArticle.topicId = form.topicId
        topicArticle.articleId = form.articleId

        await topicArticle.save({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateTopicArticleDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        await req.locals.topicArticle.destroy({transaction})

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateAuthorAddInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormAuthor()
      const validation = this.validator.makeValidationAuthor()

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateAuthorAddValidate (req, res, next) {
    try {
      const validation = await this.validator.validateAuthor(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateAuthorAddSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateAuthor(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {form} = req.body
        const author = await model.author.create({
          code: form.code,
          name: form.name,
          kana: form.kana,
          roman: form.roman,
          url: form.url,
          visual: form.visual,
          profile: form.profile,
        }, {transaction})

        const ok = true
        const redirect = './finish/?id=' + author.id

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateAuthorEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormAuthor()
      const validation = this.validator.makeValidationAuthor()
      const {author} = req.locals

      form.code = '' + author.code
      form.name = '' + author.name
      form.kana = '' + author.kana
      form.roman = '' + author.roman
      form.url = '' + author.url
      form.visual = '' + author.visual
      form.profile = '' + author.profile

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateAuthorEditValidate (req, res, next) {
    try {
      const validation = await this.validator.validateAuthor(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateAuthorEditSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateAuthor(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {author} = req.locals
        const {form} = req.body

        author.code = form.code
        author.name = form.name
        author.kana = form.kana
        author.roman = form.roman
        author.url = form.url
        author.visual = form.visual
        author.profile = form.profile

        await author.save({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateAuthorDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        await req.locals.author.destroy({transaction})

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async getSignedUrl (bucket, file) {
    const storage = new Storage()
    const [url] = await storage.bucket(bucket).file(file).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
    })

    return url
  }

  async onRequestApiV1PrivatePublicFileAddInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormPublicFile()
      const validation = this.validator.makeValidationPublicFile()

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePublicFileAddValidate (req, res, next) {
    try {
      const validation = await this.validator.validatePublicFile(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  generateRandomFilename () {
    const dirname = 'upload/'
    const timestamp = new Date().toISOString().replace(/[-:]/g, '')
    const uuid = crypto.randomBytes(16).toString('hex')

    return dirname + timestamp + uuid
  }

  async onRequestApiV1PrivatePublicFileAddUpload (req, res, next) {
    try {
      const bucket = process.env.BUCKET_PUBLIC
      const file = this.generateRandomFilename()
      const url = await this.getSignedUrl(bucket, file)
      const location = `gs://${bucket}/${file}`

      res.send({url, location})
    } catch (err) {
      next(err)
    }
  }

  makeStorageFile (url) {
    const {host, pathname} = new URL(url)
    const storage = new Storage()
    const bucket = storage.bucket(host)
    const file = bucket.file(pathname.slice(1))

    return file
  }

  async getFileHash (file) {
    return await new Promise((resolve, reject) => {
      const stream = file.createReadStream()
      const hash = crypto.createHash('sha256')

      stream.pipe(hash)
        .on('finish', () => {
          resolve(hash.digest('hex'))
        })
        .on('error', err => {
          reject(err)
        })
    })
  }

  insertFileHash (code, digest) {
    const pieces = code.split('/')
    const filename = pieces[pieces.length - 1]
    const extname = path.extname(filename)
    const basename = path.basename(filename, extname)
    const filenameNew = `${basename}-${digest.slice(0, 8)}${extname}`
    const piecesNew = pieces.slice(0, pieces.length - 1).concat([filenameNew])
    const codeNew = piecesNew.join('/')

    return codeNew
  }

  async onRequestApiV1PrivatePublicFileAddSubmit (req, res, next) {
    try {
      const validation = await this.validator.validatePublicFile(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {form} = req.body
        const publicFile = await model.publicFile.create({
          code: form.code,
          title: form.title,
          description: form.description,
          location: '',
        }, {transaction})

        const file = this.makeStorageFile(form.file)
        const digest = await this.getFileHash(file)
        const code = this.insertFileHash(form.code, digest)
        await file.move(code)

        publicFile.location = `gs://${file.bucket.name}/${code}`
        await publicFile.save({transaction})

        const ok = true
        const redirect = './finish/?id=' + publicFile.id
        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePublicFileViewInitialize (req, res, next) {
    try {
      res.send({publicFile: res.locals.publicFile})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePublicFileEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormPublicFile()
      const validation = this.validator.makeValidationPublicFile()
      const {publicFile} = req.locals

      form.code = '' + publicFile.code
      form.title = '' + publicFile.title
      form.description = '' + publicFile.description
      form.fileChange = '変更しない'

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePublicFileEditValidate (req, res, next) {
    try {
      const validation = await this.validator.validatePublicFile(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePublicFileEditUpload (req, res, next) {
    try {
      const bucket = process.env.BUCKET_PUBLIC
      const file = this.generateRandomFilename()
      const url = await this.getSignedUrl(bucket, file)
      const location = `gs://${bucket}/${file}`

      res.send({url, location})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePublicFileEditSubmit (req, res, next) {
    try {
      const validation = await this.validator.validatePublicFile(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {publicFile} = req.locals
        const {form} = req.body
        const codeBefore = publicFile.code
        const codeAfter = form.code

        publicFile.code = form.code
        publicFile.title = form.title
        publicFile.description = form.description
        await publicFile.save({transaction})

        if (form.fileChange === '変更する') {
          const file = this.makeStorageFile(form.file)
          const digest = await this.getFileHash(file)
          const code = this.insertFileHash(form.code, digest)
          const location = `gs://${file.bucket.name}/${code}`

          if (location === publicFile.location) {
            await file.delete()
          } else {
            await file.move(code)
            await this.makeStorageFile(publicFile.location).delete({
              ignoreNotFound: true,
            })

            publicFile.location = location
            await publicFile.save({transaction})
          }
        } else {
          if (codeBefore !== codeAfter) {
            const file = this.makeStorageFile(publicFile.location)
            const digest = await this.getFileHash(file)
            const code = this.insertFileHash(form.code, digest)
            const location = `gs://${file.bucket.name}/${code}`
            await file.move(code)

            publicFile.location = location
            await publicFile.save({transaction})
          }
        }

        const ok = true
        const redirect = './finish/'
        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePublicFileDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        const {location} = req.locals.publicFile
        await req.locals.publicFile.destroy({transaction})
        await this.makeStorageFile(location).delete({ignoreNotFound: true})

        const ok = true
        const redirect = '../../delete/finish/'
        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  makeDocumentSubsection () {
    const form = this.initializer.makeFormDocumentSubsection()
    const validation = this.validator.makeValidationDocumentSubsection()

    return {form, validation}
  }

  makeDocumentSection () {
    const form = this.initializer.makeFormDocumentSection()
    const validation = this.validator.makeValidationDocumentSection()
    const documentSubsections = [this.makeDocumentSubsection()]

    return {form, validation, documentSubsections}
  }

  async onRequestApiV1PrivateDocumentAddInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormDocument()
      const validation = this.validator.makeValidationDocument()
      const documentSections = [this.makeDocumentSection()]

      res.send({form, validation, documentSections})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentAddDocumentSection (req, res, next) {
    try {
      res.send(this.makeDocumentSection())
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentAddDocumentSubsection (req, res, next) {
    try {
      res.send(this.makeDocumentSubsection())
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentAddValidate (req, res, next) {
    try {
      res.send(await this.validateDocument(req))
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentAddSubmit (req, res, next) {
    try {
      const {ok} = await this.validateDocument(req)

      if (!ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {form} = req.body
        const document = await model.document.create({
          code: form.code,
          title: form.title,
          titleShort: form.titleShort,
          visual: form.visual,
          date: form.date,
          description: form.description,
          file: form.file,
          sample: form.sample,
          page: form.page,
          isPublished: this.converter.invertIsPublished(form.isPublished),
        }, {transaction})

        await this.createDocumentSections(document, req.body.documentSections, transaction)

        const ok = true
        const redirect = './finish/?id=' + document.id

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormDocument()
      const validation = this.validator.makeValidationDocument()
      const {document} = req.locals

      form.code = '' + document.code
      form.title = '' + document.title
      form.titleShort = '' + document.titleShort
      form.visual = '' + document.visual
      form.date = '' + document.date
      form.description = '' + document.description
      form.file = '' + document.file
      form.sample = '' + document.sample
      form.page = '' + document.page
      form.isPublished = this.converter.convertIsPublished(document.isPublished)

      const documentSections = (await this.findDocumentSections(document))
        .map(documentSection => {
          const {form, validation} = this.makeDocumentSection()
          form.title = documentSection.title

          const documentSubsections = documentSection.documentSubsections.map(documentSubsection => {
            const {form, validation} = this.makeDocumentSubsection()
            form.title = documentSubsection.title

            return {form, validation}
          })

          return {form, validation, documentSubsections}
        })

      res.send({form, validation, documentSections})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentEditDocumentSection (req, res, next) {
    try {
      res.send(this.makeDocumentSection())
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentEditDocumentSubsection (req, res, next) {
    try {
      res.send(this.makeDocumentSubsection())
    } catch (err) {
      next(err)
    }
  }

  async validateDocument (req) {
    const validation = await this.validator.validateDocument(req)
    const documentSections = []

    for (const documentSection of req.body.documentSections) {
      const {form} = documentSection
      const validation = await this.validator.validateDocumentSection(form)
      const documentSubsections = []

      for (const documentSubsection of documentSection.documentSubsections) {
        const {form} = documentSubsection
        const validation = await this.validator.validateDocumentSubsection(form)

        documentSubsections.push({validation})
      }

      const ok = documentSubsections.every(documentSubsection => {
        return documentSubsection.validation.ok === true
      })

      documentSections.push({ok, validation, documentSubsections})
    }

    const ok = validation.ok === true
      && documentSections.every(documentSection => {
        return documentSection.ok === true
      })

    return {ok, validation, documentSections}
  }

  async onRequestApiV1PrivateDocumentEditValidate (req, res, next) {
    try {
      res.send(await this.validateDocument(req))
    } catch (err) {
      next(err)
    }
  }

  async createDocumentSections (document, documentSections, transaction) {
    for (const documentSection of documentSections) {
      const {id} = await model.documentSection.create({
        sort: documentSections.indexOf(documentSection) + 1,
        title: documentSection.form.title,
        documentId: document.id,
      }, {transaction})

      for (const documentSubsection of documentSection.documentSubsections) {
        await model.documentSubsection.create({
          sort: documentSection.documentSubsections.indexOf(documentSubsection) + 1,
          title: documentSubsection.form.title,
          documentSectionId: id,
        }, {transaction})
      }
    }
  }

  async onRequestApiV1PrivateDocumentEditSubmit (req, res, next) {
    try {
      const {ok} = await this.validateDocument(req)

      if (!ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {document} = req.locals
        const {form} = req.body

        document.code = form.code
        document.title = form.title
        document.titleShort = form.titleShort
        document.visual = form.visual
        document.date = form.date
        document.description = form.description
        document.file = form.file
        document.sample = form.sample
        document.page = form.page
        document.isPublished = this.converter.invertIsPublished(form.isPublished)

        await document.save({transaction})

        await model.documentSection.destroy({
          where: {
            documentId: {[Op.eq]: document.id},
          },
          transaction,
        })

        await this.createDocumentSections(document, req.body.documentSections, transaction)

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        await req.locals.document.destroy({transaction})

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async makeOptionsDocumentArticle () {
    const documents = await model.document.findAll({
      order: [['date', 'asc'], ['id', 'asc']],
    })

    const articles = await model.article.findAll({
      order: [['date', 'asc'], ['id', 'asc']],
    })

    return {
      documentId: documents.map(document => ({
        value: '' + document.id,
        text: '' + document.title,
      })),
      articleId: articles.map(article => ({
        value: '' + article.id,
        text: '' + article.title,
      })),
    }
  }

  async onRequestApiV1PrivateDocumentArticleAddInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormDocumentArticle()
      const validation = this.validator.makeValidationDocumentArticle()
      const options = await this.makeOptionsDocumentArticle()

      res.send({form, validation, options})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentArticleAddValidate (req, res, next) {
    try {
      const validation = await this.validator.validateDocumentArticle(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentArticleAddSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateDocumentArticle(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {form} = req.body
        const documentArticle = await model.documentArticle.create({
          sort: form.sort,
          documentId: form.documentId,
          articleId: form.articleId,
        }, {transaction})

        const ok = true
        const redirect = './finish/?id=' + documentArticle.id

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentArticleEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormDocumentArticle()
      const validation = this.validator.makeValidationDocumentArticle()
      const options = await this.makeOptionsDocumentArticle()
      const {documentArticle} = req.locals

      form.sort = '' + documentArticle.sort
      form.documentId = '' + documentArticle.documentId
      form.articleId = '' + documentArticle.articleId

      res.send({form, validation, options})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentArticleEditValidate (req, res, next) {
    try {
      const validation = await this.validator.validateDocumentArticle(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentArticleEditSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateDocumentArticle(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {documentArticle} = req.locals
        const {form} = req.body

        documentArticle.sort = form.sort
        documentArticle.documentId = form.documentId
        documentArticle.articleId = form.articleId

        await documentArticle.save({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateDocumentArticleDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        await req.locals.documentArticle.destroy({transaction})

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePrivateFileAddInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormPrivateFile()
      const validation = this.validator.makeValidationPrivateFile()

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePrivateFileAddValidate (req, res, next) {
    try {
      const validation = await this.validator.validatePrivateFile(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePrivateFileAddUpload (req, res, next) {
    try {
      const bucket = process.env.BUCKET_PRIVATE
      const file = req.query.code
      const url = await this.getSignedUrl(bucket, file)

      res.send({url})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePrivateFileAddSubmit (req, res, next) {
    try {
      const validation = await this.validator.validatePrivateFile(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {form} = req.body
        const privateFile = await model.privateFile.create({
          code: form.code,
          title: form.title,
          description: form.description,
          location: `gs://${process.env.BUCKET_PRIVATE}/${form.code}`,
        }, {transaction})

        const ok = true
        const redirect = './finish/?id=' + privateFile.id

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePrivateFileEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormPrivateFile()
      const validation = this.validator.makeValidationPrivateFile()
      const {privateFile} = req.locals

      form.code = '' + privateFile.code
      form.title = '' + privateFile.title
      form.description = '' + privateFile.description
      form.fileChange = '変更しない'

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePrivateFileEditValidate (req, res, next) {
    try {
      const validation = await this.validator.validatePrivateFile(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePrivateFileEditUpload (req, res, next) {
    try {
      const bucket = process.env.BUCKET_PRIVATE
      const file = req.query.code
      const url = await this.getSignedUrl(bucket, file)

      res.send({url})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePrivateFileEditSubmit (req, res, next) {
    try {
      const validation = await this.validator.validatePrivateFile(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {privateFile} = req.locals
        const {form} = req.body
        const codeBefore = privateFile.code
        const codeAfter = form.code

        privateFile.code = form.code
        privateFile.title = form.title
        privateFile.description = form.description
        privateFile.location = `gs://${process.env.BUCKET_PRIVATE}/${form.code}`,

        await privateFile.save({transaction})

        const storage = new Storage()
        const bucket = storage.bucket(process.env.BUCKET_PRIVATE)
        const file = bucket.file(codeBefore)

        if (codeBefore !== codeAfter) {        
          if (form.fileChange === '変更する') {
            await file.delete()
          } else {
            await file.move(codeAfter)
          }
        }

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivatePrivateFileDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        const {code} = req.locals.privateFile
        await req.locals.privateFile.destroy({transaction})

        const storage = new Storage()
        const bucket = storage.bucket(process.env.BUCKET_PRIVATE)
        const file = bucket.file(code)
        await file.delete()

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateRequestDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        await req.locals.request.destroy({transaction})

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateUnsubscribeDeleteSubmit (req, res, next) {
    try {
      await model.sequelize.transaction(async (transaction) => {
        await req.locals.unsubscribe.destroy({transaction})

        const ok = true
        const redirect = '../../delete/finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateEmailTemplateEditInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormEmailTemplate()
      const validation = this.validator.makeValidationEmailTemplate()
      const {emailTemplate} = req.locals

      form.fromEmail = '' + emailTemplate.fromEmail
      form.fromName = '' + emailTemplate.fromName
      form.toEmail = '' + emailTemplate.toEmail
      form.toName = '' + emailTemplate.toName
      form.subject = '' + emailTemplate.subject
      form.content = '' + emailTemplate.content

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateEmailTemplateEditValidate (req, res, next) {
    try {
      const validation = await this.validator.validateEmailTemplate(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1PrivateEmailTemplateEditSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateEmailTemplate(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {emailTemplate} = req.locals
        const {form} = req.body

        emailTemplate.fromEmail = form.fromEmail
        emailTemplate.fromName = form.fromName
        emailTemplate.toEmail = form.toEmail
        emailTemplate.toName = form.toName
        emailTemplate.subject = form.subject
        emailTemplate.content = form.content

        await emailTemplate.save({transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  partitionBy(f, coll) {
    return this.partitionByAccumulate(f, coll, [])
  }

  partitionByAccumulate(f, coll, acc) {
    if (coll.length === 0) {
      return acc.map(el => el.reverse()).reverse()
    }

    const [head] = coll
    const tail = coll.slice(1)

    if (acc.length === 0 || f(head) !== f(acc[0][0])) {
      acc.unshift([head])
      return this.partitionByAccumulate(f, tail, acc)
    } else {
      acc[0].unshift(head)
      return this.partitionByAccumulate(f, tail, acc)
    }
  }

  onRequestNotFound (req, res) {
    res.status(404).end()
  }

  onRequestInternalServerError(err, req, res, next) {
    res.status(500).end()
    this.onError(err)
  }

  onError (err) {
    winston.loggers.get('error').error(err.message)
    winston.loggers.get('debug').debug(err.stack)
  }
}

module.exports.App = App
