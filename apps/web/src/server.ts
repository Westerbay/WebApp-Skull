import { paraglideMiddleware } from "@workspace/i18n/server"
import handler from "@tanstack/react-start/server-entry"

export default {
  fetch(request: Request) {
    const handleLocalizedRequest = () => handler.fetch(request)
    return paraglideMiddleware(request, handleLocalizedRequest)
  },
}
