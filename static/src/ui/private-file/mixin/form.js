import FormMixin from '../../mixin/form'

export default {
  mixins: [FormMixin],

  methods: {
    async upload () {
      const pathname = this.api + 'upload'
      const search = '?code=' + encodeURIComponent(this.body.form.code)
      const response = await fetch(pathname + search)
      const body = await response.json()
      const [file] = document.querySelector('#file').files

      await fetch(body.url, {
        method: 'PUT',
        body: file,
      })
    },

    async onClickButtonSubmit () {
      try {
        if (this.body.form.fileChange === '変更する') {
          const [file] = document.querySelector('#file').files
          this.body.form.file = file ? file.name : ''
        } else {
          this.body.form.file = ''
        }

        const options = this.makeOptions()
        const response = await fetch(this.api + 'validate', options)
        const body = await response.json()

        this.body.validation = body.validation

        if (body.validation.ok) {
          if (this.body.form.fileChange === '変更する') {
            await this.upload()
          }

          const response = await fetch(this.api + 'submit', options)
          const body = await response.json()

          if (body.ok) {
            window.location.assign(body.redirect)
            return
          }
        } else {
          window.scrollTo(0, 0)
        }
      } catch (err) {
        this.onError(err)
      }
    },
  },
}
