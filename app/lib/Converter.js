const {Storage} = require('@google-cloud/storage')

class Converter {
  convertArticle (article) {
    return {
      id: article.id,
      code: article.code,
      title: article.title,
      titleShort: article.titleShort,
      visual: article.visual,
      date: article.date,
      dateText: this.convertDate(article.date),
      description: article.description,
      descriptionLines: this.splitText(article.description),
      body: article.body,
      minute: article.minute,
      isPublished: article.isPublished,
      isPublishedText: this.convertIsPublished(article.isPublished),
    }
  }

  convertSerial (serial) {
    return {
      id: serial.id,
      code: serial.code,
      title: serial.title,
      titleShort: serial.titleShort,
      visual: serial.visual,
      isPublished: serial.isPublished,
      isPublishedText: this.convertIsPublished(serial.isPublished),
    }
  }

  convertAuthor (author) {
    return {
      id: author.id,
      code: author.code,
      name: author.name,
      kana: author.kana,
      roman: author.roman,
      url: author.url,
      visual: author.visual,
      profile: author.profile,
      profileLines: this.splitText(author.profile),
    }
  }

  async convertDocument (document) {
    return {
      id: document.id,
      code: document.code,
      title: document.title,
      titleShort: document.titleShort,
      visual: document.visual,
      date: document.date,
      dateText: this.convertDate(document.date),
      description: document.description,
      descriptionLines: this.splitText(document.description),
      file: document.file,
      fileUrl: await this.convertUrl(document.file),
      sample: document.sample,
      sampleUrl: await this.convertUrl(document.sample),
      page: document.page,
      isPublished: document.isPublished,
      isPublishedText: this.convertIsPublished(document.isPublished),
    }
  }

  convertPublicFile (publicFile) {
    const url = new URL(publicFile.location, process.env.BASE_URL)
    const storage = new Storage()
    const bucket = storage.bucket(url.host)
    const file = bucket.file(url.pathname.slice(1))
    const locationUrl = file.publicUrl()

    return {
      id: publicFile.id,
      code: publicFile.code,
      title: publicFile.title,
      description: publicFile.description,
      descriptionLines: this.splitText(publicFile.description),
      location: publicFile.location,
      locationUrl,
    }
  }

  async convertPrivateFile (privateFile) {
    return {
      id: privateFile.id,
      code: privateFile.code,
      title: privateFile.title,
      description: privateFile.description,
      descriptionLines: this.splitText(privateFile.description),
      location: privateFile.location,
      locationUrl: await this.convertUrl(privateFile.location),
    }
  }

  async convertRequest (request) {
    return {
      id: request.id,
      date: request.date,
      dateText: this.convertDateTime(request.date),
      name: request.name,
      email: request.email,
      subscribe: request.subscribe,
    }
  }

  async convertUnsubscribe (unsubscribe) {
    return {
      id: unsubscribe.id,
      date: unsubscribe.date,
      dateText: this.convertDateTime(unsubscribe.date),
      email: unsubscribe.email,
    }
  }

  async convertEmailTemplate (emailTemplate) {
    return {
      id: emailTemplate.id,
      sort: emailTemplate.sort,
      code: emailTemplate.code,
      title: emailTemplate.title,
      fromEmail: emailTemplate.fromEmail,
      fromName: emailTemplate.fromName,
      toEmail: emailTemplate.toEmail,
      toName: emailTemplate.toName,
      subject: emailTemplate.subject,
      content: emailTemplate.content,
      contentLines: this.splitText(emailTemplate.content),
    }
  }

  async convertEmail (email) {
    return {
      id: email.id,
      date: email.date,
      dateText: this.convertDateTime(email.date),
      fromEmail: email.fromEmail,
      fromName: email.fromName,
      toEmail: email.toEmail,
      toName: email.toName,
      subject: email.subject,
      content: email.content,
      contentLines: this.splitText(email.content),
      isSent: email.isSent,
      isSentText: email.isSent ? '送信済み' : '未送信',
      errorCount: email.errorCount,
      errorMessage: email.errorMessage,
      errorStack: email.errorStack,
      errorStackLines: this.splitText(email.errorStack),
    }
  }

  convertIsPublished (isPublished) {
    return isPublished ? '公開' : '下書き'
  }

  invertIsPublished (isPublished) {
    if (isPublished === '公開') {
      return true
    } else if (isPublished === '下書き') {
      return false
    } else {
      throw new TypeError(`invalid isPublished: ${isPublished}`)
    }
  }

  convertDate (str) {
    const pieces = str.split('-')
    const year = parseInt(pieces[0], 10)
    const month = parseInt(pieces[1], 10)
    const day = parseInt(pieces[2], 10)

    return `${year}年${month}月${day}日`
  }

  convertDateTime (date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()

    return `${year}年${month}月${day}日${hour}時${minute}分${second}秒`
  }

  async convertUrl (str) {
    const url = new URL(str, process.env.BASE_URL)

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return str
    } else if (url.protocol === 'gs:') {
      const storage = new Storage()
      const bucket = storage.bucket(url.host)
      const file = bucket.file(url.pathname.slice(1))
      const minute = 60 * 1000
      const [signedUrl] = await file.getSignedUrl({

        action: 'read',
        expires: new Date().getTime() + 24 * 60 * minute,
      })

      return signedUrl
    } else {
      throw new Error(`invalid url.protocol: ${url.protocol}`)
    }
  }

  splitText (text) {
    return text.split('\n')
  }
}

module.exports.Converter = Converter
