class Initializer {
  makeFormArticle () {
    return {
      code: '',
      title: '',
      titleShort: '',
      visual: '',
      date: '',
      description: '',
      body: '',
      minute: '',
      isPublished: '下書き',
    }
  }

  makeFormArticleSection () {
    return {
      title: '',
      url: '',
    }
  }

  makeFormArticleSerialSet () {
    return {
      sort: '',
      serialId: '',
    }
  }

  makeFormArticleDocumentSet () {
    return {
      documentId: '',
    }
  }

  makeFormArticleAuthorSet () {
    return {
      authorId: '',
    }
  }

  makeFormArticleArticle () {
    return {
      sort: '',
      articleFromId: '',
      articleToId: '',
    }
  }

  makeFormSerial () {
    return {
      code: '',
      title: '',
      titleShort: '',
      visual: '',
      isPublished: '下書き',
    }
  }

  makeFormSerialCategorySet () {
    return {
      sort: '',
      categoryId: '',
    }
  }

  makeFormCategory () {
    return {
      sort: '',
      code: '',
      title: '',
    }
  }

  makeFormTopic () {
    return {
      sort: '',
      code: '',
      title: '',
    }
  }

  makeFormTopicArticle () {
    return {
      sort: '',
      topicId: '',
      articleId: '',
    }
  }

  makeFormAuthor () {
    return {
      code: '',
      name: '',
      kana: '',
      roman: '',
      url: '',
      visual: '',
      profile: '',
    }
  }

  makeFormPublicFile () {
    return {
      code: '',
      title: '',
      description: '',
      fileChange: '変更する',
      file: '',
    }
  }

  makeFormDocument () {
    return {
      code: '',
      title: '',
      titleShort: '',
      visual: '',
      date: '',
      description: '',
      file: '',
      sample: '',
      page: '',
      isPublished: '下書き',
    }
  }

  makeFormDocumentSection () {
    return {
      title: '',
    }
  }

  makeFormDocumentSubsection () {
    return {
      title: '',
    }
  }

  makeFormDocumentArticle () {
    return {
      sort: '',
      documentId: '',
      articleId: '',
    }
  }

  makeFormPrivateFile () {
    return {
      code: '',
      title: '',
      description: '',
      fileChange: '変更する',
      file: '',
    }
  }

  makeFormEmailTemplate () {
    return {
      fromEmail: '',
      fromName: '',
      toEmail: '',
      toName: '',
      subject: '',
      content: '',
    }
  }
}

module.exports.Initializer = Initializer
