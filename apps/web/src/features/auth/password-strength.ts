import { ZxcvbnFactory } from "@zxcvbn-ts/core"
import { adjacencyGraphs, dictionary } from "@zxcvbn-ts/language-common"
import { dictionary as englishDictionary } from "@zxcvbn-ts/language-en"
import { dictionary as frenchDictionary } from "@zxcvbn-ts/language-fr"
import { authPasswordConstraints } from "@workspace/contracts/auth/constraints"

const estimator = new ZxcvbnFactory({
  graphs: adjacencyGraphs,
  dictionary: { ...dictionary, ...englishDictionary, ...frenchDictionary },
  maxLength: authPasswordConstraints.maxLength,
})

export function getPasswordStrength(password: string) {
  return estimator.check(password.slice(0, authPasswordConstraints.maxLength))
    .score
}
