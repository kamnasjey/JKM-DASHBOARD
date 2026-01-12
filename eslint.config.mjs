import coreWebVitals from "eslint-config-next/core-web-vitals"

export default [
	...coreWebVitals,
	{
		name: "project-overrides",
		rules: {
			"react/no-unescaped-entities": "off",
			"react-hooks/exhaustive-deps": "off",
			"react-hooks/immutability": "off",
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/purity": "off",
		},
	},
	{
		name: "config-file-overrides",
		files: ["eslint.config.mjs"],
		rules: {
			"import/no-anonymous-default-export": "off",
		},
	},
]
