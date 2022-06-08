const model = require('../model')
const {Op} = model.Sequelize

class Validator {
  makeValidationArticle () {
    return {
      ok: null,
      code: this.makeValidationFieldUnique(),
      title: this.makeValidationFieldNotEmpty(),
      titleShort: this.makeValidationFieldNotEmpty(),
      visual: this.makeValidationFieldNotEmpty(),
      date: this.makeValidationFieldNotEmpty(),
      description: this.makeValidationFieldNotEmpty(),
      body: this.makeValidationFieldNotEmpty(),
      minute: this.makeValidationFieldNotEmpty(),
      isPublished: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateArticle (req) {
    const validation = this.makeValidationArticle()

    validation.code = await this.validateFieldUniqueArticle(req)
    validation.title = this.validateFieldNotEmpty(req.body.form.title)
    validation.titleShort = this.validateFieldNotEmpty(req.body.form.titleShort)
    validation.visual = this.validateFieldNotEmpty(req.body.form.visual)
    validation.date = this.validateFieldNotEmpty(req.body.form.date)
    validation.description = this.validateFieldNotEmpty(req.body.form.description)
    validation.body = this.validateFieldNotEmpty(req.body.form.body)
    validation.minute = this.validateFieldNotEmpty(req.body.form.minute)
    validation.isPublished = this.validateFieldNotEmpty(req.body.form.isPublished)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationArticleSection () {
    return {
      ok: null,
      title: this.makeValidationFieldNotEmpty(),
      url: this.makeValidationFieldNotEmpty(),
    }
  }

  makeValidationArticleSerialSet () {
    return {
      ok: null,
      sort: this.makeValidationFieldNotEmpty(),
      serialId: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateArticleSerialSet (req) {
    const validation = this.makeValidationArticleSerialSet()

    validation.sort = this.validateFieldNotEmpty(req.body.form.sort)
    validation.serialId = this.validateFieldNotEmpty(req.body.form.serialId)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationArticleDocumentSet () {
    return {
      ok: null,
      documentId: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateArticleDocumentSet (req) {
    const validation = this.makeValidationArticleDocumentSet()

    validation.documentId = this.validateFieldNotEmpty(req.body.form.documentId)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationArticleAuthorSet () {
    return {
      ok: null,
      authorId: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateArticleAuthorSet (req) {
    const validation = this.makeValidationArticleAuthorSet()

    validation.authorId = this.validateFieldNotEmpty(req.body.form.authorId)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  async validateArticleSection (form) {
    const validation = this.makeValidationArticleSection()

    validation.title = this.validateFieldNotEmpty(form.title)
    validation.url = this.validateFieldNotEmpty(form.url)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationArticleArticle () {
    return {
      ok: null,
      sort: this.makeValidationFieldNotEmpty(),
      articleFromId: this.makeValidationFieldNotEmpty(),
      articleToId: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateArticleArticle (req) {
    const validation = this.makeValidationArticleArticle()

    validation.sort = this.validateFieldNotEmpty(req.body.form.sort)
    validation.articleFromId = this.validateFieldNotEmpty(req.body.form.articleFromId)
    validation.articleToId = this.validateFieldNotEmpty(req.body.form.articleToId)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationSerial () {
    return {
      ok: null,
      code: this.makeValidationFieldUnique(),
      title: this.makeValidationFieldNotEmpty(),
      titleShort: this.makeValidationFieldNotEmpty(),
      visual: this.makeValidationFieldNotEmpty(),
      isPublished: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateSerial (req) {
    const validation = this.makeValidationSerial()

    validation.code = await this.validateFieldUniqueSerial(req)
    validation.title = this.validateFieldNotEmpty(req.body.form.title)
    validation.titleShort = this.validateFieldNotEmpty(req.body.form.titleShort)
    validation.visual = this.validateFieldNotEmpty(req.body.form.visual)
    validation.isPublished = this.validateFieldNotEmpty(req.body.form.isPublished)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationSerialCategorySet () {
    return {
      ok: null,
      sort: this.makeValidationFieldNotEmpty(),
      categoryId: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateSerialCategorySet (req) {
    const validation = this.makeValidationSerialCategorySet()

    validation.sort = this.validateFieldNotEmpty(req.body.form.sort)
    validation.categoryId = this.validateFieldNotEmpty(req.body.form.categoryId)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationCategory () {
    return {
      ok: null,
      sort: this.makeValidationFieldNotEmpty(),
      code: this.makeValidationFieldUnique(),
      title: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateCategory (req) {
    const validation = this.makeValidationCategory()

    validation.sort = this.validateFieldNotEmpty(req.body.form.sort)
    validation.code = await this.validateFieldUniqueCategory(req)
    validation.title = this.validateFieldNotEmpty(req.body.form.title)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationTopic () {
    return {
      ok: null,
      sort: this.makeValidationFieldNotEmpty(),
      code: this.makeValidationFieldUnique(),
      title: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateTopic (req) {
    const validation = this.makeValidationTopic()

    validation.sort = this.validateFieldNotEmpty(req.body.form.sort)
    validation.code = await this.validateFieldUniqueTopic(req)
    validation.title = this.validateFieldNotEmpty(req.body.form.title)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationTopicArticle () {
    return {
      ok: null,
      sort: this.makeValidationFieldNotEmpty(),
      topicId: this.makeValidationFieldNotEmpty(),
      articleId: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateTopicArticle (req) {
    const validation = this.makeValidationTopicArticle()

    validation.sort = this.validateFieldNotEmpty(req.body.form.sort)
    validation.topicId = await this.validateFieldNotEmpty(req.body.form.topicId)
    validation.articleId = this.validateFieldNotEmpty(req.body.form.articleId)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationAuthor () {
    return {
      ok: null,
      code: this.makeValidationFieldUnique(),
      name: this.makeValidationFieldNotEmpty(),
      kana: this.makeValidationFieldNotEmpty(),
      roman: this.makeValidationFieldNotEmpty(),
      url: this.makeValidationFieldNotEmpty(),
      visual: this.makeValidationFieldNotEmpty(),
      profile: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateAuthor (req) {
    const validation = this.makeValidationAuthor()

    validation.code = await this.validateFieldUniqueAuthor(req)
    validation.name = this.validateFieldNotEmpty(req.body.form.name)
    validation.kana = this.validateFieldNotEmpty(req.body.form.kana)
    validation.roman = this.validateFieldNotEmpty(req.body.form.roman)
    validation.url = this.validateFieldNotEmpty(req.body.form.url)
    validation.visual = this.validateFieldNotEmpty(req.body.form.visual)
    validation.profile = this.validateFieldNotEmpty(req.body.form.profile)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationPublicFile () {
    return {
      ok: null,
      code: this.makeValidationFieldUnique(),
      title: this.makeValidationFieldNotEmpty(),
      description: this.makeValidationFieldNotUndefined(),
      file: this.makeValidationFieldNotEmpty(),
    }
  }

  async validatePublicFile (req) {
    const validation = this.makeValidationPublicFile()

    validation.code = await this.validateFieldUniquePublicFile(req)
    validation.title = this.validateFieldNotEmpty(req.body.form.title)
    validation.description = this.validateFieldNotUndefined(req.body.form.description)

    if (req.body.form.fileChange === '変更する') {
      validation.file = this.validateFieldNotEmpty(req.body.form.file)
    } else {
      validation.file.ok = true
    }

    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationDocument () {
    return {
      ok: null,
      code: this.makeValidationFieldUnique(),
      title: this.makeValidationFieldNotEmpty(),
      titleShort: this.makeValidationFieldNotEmpty(),
      visual: this.makeValidationFieldNotEmpty(),
      date: this.makeValidationFieldNotEmpty(),
      description: this.makeValidationFieldNotEmpty(),
      file: this.makeValidationFieldNotEmpty(),
      sample: this.makeValidationFieldNotEmpty(),
      page: this.makeValidationFieldNotEmpty(),
      isPublished: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateDocument (req) {
    const validation = this.makeValidationDocument()

    validation.code = await this.validateFieldUniqueDocument(req)
    validation.title = this.validateFieldNotEmpty(req.body.form.title)
    validation.titleShort = this.validateFieldNotEmpty(req.body.form.titleShort)
    validation.visual = this.validateFieldNotEmpty(req.body.form.visual)
    validation.date = this.validateFieldNotEmpty(req.body.form.date)
    validation.description = this.validateFieldNotEmpty(req.body.form.description)
    validation.file = this.validateFieldNotEmpty(req.body.form.file)
    validation.sample = this.validateFieldNotEmpty(req.body.form.sample)
    validation.page = this.validateFieldNotEmpty(req.body.form.page)
    validation.isPublished = this.validateFieldNotEmpty(req.body.form.isPublished)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationDocumentSection () {
    return {
      ok: null,
      title: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateDocumentSection (form) {
    const validation = this.makeValidationDocumentSection()

    validation.title = this.validateFieldNotEmpty(form.title)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationDocumentSubsection () {
    return {
      ok: null,
      title: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateDocumentSubsection (form) {
    const validation = this.makeValidationDocumentSubsection()

    validation.title = this.validateFieldNotEmpty(form.title)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationDocumentArticle () {
    return {
      ok: null,
      sort: this.makeValidationFieldNotEmpty(),
      documentId: this.makeValidationFieldNotEmpty(),
      articleId: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateDocumentArticle (req) {
    const validation = this.makeValidationDocumentArticle()

    validation.sort = this.validateFieldNotEmpty(req.body.form.sort)
    validation.documentId = await this.validateFieldNotEmpty(req.body.form.documentId)
    validation.articleId = this.validateFieldNotEmpty(req.body.form.articleId)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationPrivateFile () {
    return {
      ok: null,
      code: this.makeValidationFieldUnique(),
      title: this.makeValidationFieldNotEmpty(),
      description: this.makeValidationFieldNotUndefined(),
      file: this.makeValidationFieldNotEmpty(),
    }
  }

  async validatePrivateFile (req) {
    const validation = this.makeValidationPrivateFile()

    validation.code = await this.validateFieldUniquePrivateFile(req)
    validation.title = this.validateFieldNotEmpty(req.body.form.title)
    validation.description = this.validateFieldNotUndefined(req.body.form.description)

    if (req.body.form.fileChange === '変更する') {
      validation.file = this.validateFieldNotEmpty(req.body.form.file)
    } else {
      validation.file.ok = true
    }

    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationEmailTemplate () {
    return {
      ok: null,
      fromEmail: this.makeValidationFieldNotEmpty(),
      fromName: this.makeValidationFieldNotEmpty(),
      toEmail: this.makeValidationFieldNotEmpty(),
      toName: this.makeValidationFieldNotEmpty(),
      subject: this.makeValidationFieldNotEmpty(),
      content: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateEmailTemplate (req) {
    const validation = this.makeValidationEmailTemplate()

    validation.fromEmail = this.validateFieldNotEmpty(req.body.form.fromEmail)
    validation.fromName = this.validateFieldNotEmpty(req.body.form.fromName)
    validation.toEmail = this.validateFieldNotEmpty(req.body.form.toEmail)
    validation.toName = this.validateFieldNotEmpty(req.body.form.toName)
    validation.subject = this.validateFieldNotEmpty(req.body.form.subject)
    validation.content = this.validateFieldNotEmpty(req.body.form.content)

    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationFieldNotUndefined () {
    return {
      ok: null,
      isNotUndefined: null,
    }
  }

  validateFieldNotUndefined (value) {
    const validationField = this.makeValidationFieldNotUndefined()

    validationField.isNotUndefined = typeof value !== 'undefined'
    validationField.ok = this.isValidField(validationField)

    return validationField
  }

  makeValidationFieldNotEmpty () {
    return {
      ok: null,
      isNotUndefined: null,
      isNotEmpty: null,
    }
  }

  validateFieldNotEmpty (value) {
    const validationField = this.makeValidationFieldNotEmpty()

    validationField.isNotUndefined = typeof value !== 'undefined'

    if (validationField.isNotUndefined) {
      validationField.isNotEmpty = value !== ''
    }

    validationField.ok = this.isValidField(validationField)

    return validationField
  }

  makeValidationFieldUnique () {
    return {
      ok: null,
      isNotEmpty: null,
      isUnique: null,
    }
  }

  async validateFieldUniqueArticle (req, key, field) {
    return await this.validateFieldUnique(req, 'article', 'code')
  }

  async validateFieldUniqueSerial (req) {
    return await this.validateFieldUnique(req, 'serial', 'code')
  }

  async validateFieldUniqueCategory (req) {
    return await this.validateFieldUnique(req, 'category', 'code')
  }

  async validateFieldUniqueTopic (req) {
    return await this.validateFieldUnique(req, 'topic', 'code')
  }

  async validateFieldUniqueAuthor (req) {
    return await this.validateFieldUnique(req, 'author', 'code')
  }

  async validateFieldUniquePublicFile (req) {
    return await this.validateFieldUnique(req, 'publicFile', 'code')
  }

  async validateFieldUniqueDocument (req) {
    return await this.validateFieldUnique(req, 'document', 'code')
  }

  async validateFieldUniquePrivateFile (req) {
    return await this.validateFieldUnique(req, 'privateFile', 'code')
  }

  async validateFieldUnique (req, key, field) {
    const validationField = this.makeValidationFieldUnique()
    const value = req.body.form[field]

    validationField.isNotEmpty = value !== ''

    if (validationField.isNotEmpty) {
      const where = {}
      where[field] = {[Op.eq]: value}

      const row = await model[key].findOne({where})

      if (req.locals[key]) {
        validationField.isUnique = !row || value === req.locals[key][field]
      } else {
        validationField.isUnique = !row
      }
    }

    validationField.ok = this.isValidField(validationField)

    return validationField
  }

  isValidRequest (validation) {
    return Object.keys(validation).every(key => {
      return key === 'ok' || validation[key].ok
    })
  }

  isValidField (validationField) {
    return Object.keys(validationField).every(key => {
      return key === 'ok' || validationField[key]
    })
  }
}

module.exports.Validator = Validator
