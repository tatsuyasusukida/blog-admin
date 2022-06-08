import FormMixin from '../../mixin/form'

export default {
  data () {
    return {
      method: null,
    }
  },

  mixins: [FormMixin],

  methods: {
    makeOptions () {
      return {
        method: this.method,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(this.body),
      }
    },

    async onClickButtonSectionAdd () {
      const response = await fetch(this.api + 'article-section')
      const body = await response.json()

      this.body.articleSections.push(body)
    },

    async onClickButtonSectionRemove (i) {
      this.body.articleSections.splice(i, 1)
    },

    async onClickButtonSubmit () {
      try {
        const options = this.makeOptions()
        const response = await fetch(this.api + 'validate', options)
        const body = await response.json()

        this.body.validation = body.validation

        for (const articleSection of this.body.articleSections) {
          const i = this.body.articleSections.indexOf(articleSection)
          articleSection.validation = body.articleSections[i].validation
        }

        this.body.articleSections

        if (body.ok) {
          const response = await fetch(this.api + 'submit', options)
          const body = await response.json()

          if (body.ok) {
            window.location.assign(body.redirect)
            return
          }
        } else {
          window.location.assign('#page-top')
        }
      } catch (err) {
        this.onError(err)
        throw err
      }
    },
  },
}
