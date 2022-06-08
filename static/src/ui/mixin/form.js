import ViewMixin from './view'

export default {
  data () {
    return {
      method: null,
    }
  },

  mixins: [ViewMixin],

  methods: {
    makeOptions () {
      return {
        method: this.method,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({form: this.body.form}),
      }
    },

    async onClickButtonSubmit () {
      try {
        const options = this.makeOptions()
        const response = await fetch(this.api + 'validate', options)
        const body = await response.json()

        this.body.validation = body.validation

        if (body.validation.ok) {
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
        throw err
      }
    },
  },
}
