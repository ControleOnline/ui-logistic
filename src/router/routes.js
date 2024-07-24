export const routes = [
  {
    path: "/logistic/",
    component: () =>
      import("@controleonline/ui-layout/src/layouts/AdminLayout.vue"),
    children: [
      {
        name: "ChecklistDetails",
        path: "checklist/id/:id/:token_url",
        component: () => import("../pages/Surveys/Details.vue"),
      },
      {
        name: "StretchSearching",
        path: "",
        component: () => import("../pages/Logistic/index.vue"),
      },
    ],
  },
];
