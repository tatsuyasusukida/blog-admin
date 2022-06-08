import BaseMixin from './base'

export default {
  mixins: [BaseMixin],

  data () {
    return {
      body: null,
    }
  },

  methods: {
    async initialize () {
      try {
        const url = this.api + 'initialize' + window.location.search
        const response = await fetch(url)

        this.body = await response.json()
      } catch (err) {
        this.onError(err)
        throw err
      }
    },
  },
}
