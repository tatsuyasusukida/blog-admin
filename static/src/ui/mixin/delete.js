import BaseMixin from './base'

export default {
  mixins: [BaseMixin],

  methods: {
    async onClickButtonSubmit () {
      try {
        const response = await fetch(this.api + 'submit', {
          method: 'DELETE',
        })

        const body = await response.json()

        if (body.ok) {
          window.location.assign(body.redirect)
          return
        }
      } catch (err) {
        this.onError(err)
        throw err
      }
    },
  },
}
