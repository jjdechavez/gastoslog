package v1

type PaginationMeta struct {
	Page  int `json:"page" doc:"Page number"`
	Limit int `json:"limit" doc:"Limit per page"`
}
