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
      const response = await fetch(this.api + 'document-section')
      const body = await response.json()

      this.body.documentSections.push(body)
    },

    async onClickButtonSectionRemove (i) {
      this.body.documentSections.splice(i, 1)
    },

    async onClickButtonSubsectionAdd (i) {
      const response = await fetch(this.api + 'document-subsection')
      const body = await response.json()

      this.body.documentSections[i].documentSubsections.push(body)
    },

    async onClickButtonSubsectionRemove (i, j) {
      this.body.documentSections[i].documentSubsections.splice(j, 1)
    },

    async onClickButtonSubmit () {
      try {
        const options = this.makeOptions()
        const response = await fetch(this.api + 'validate', options)
        const body = await response.json()

        this.body.validation = body.validation

        for (const documentSection of this.body.documentSections) {
          const i = this.body.documentSections.indexOf(documentSection)
          documentSection.validation = body.documentSections[i].validation

          for (const documentSubsection of documentSection.documentSubsections) {
            const j = documentSection.documentSubsections.indexOf(documentSubsection)
            documentSubsection.validation = body.documentSections[i].documentSubsections[j].validation
          }
        }

        this.body.documentSections

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
