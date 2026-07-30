import { baseApi } from "@lib/query/baseApi";
import type { UUID } from "@shared/types/lms";

/** Mirror of backend RoomPricingRuleDto. */
export interface RoomPricingRuleDto {
  id: UUID;
  roomId: UUID;
  name: string;
  hourlyRate: number;
  currency: string;
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  validFrom?: string;
  validTo?: string;
  priority: number;
}

/** Mirror of backend pricing upsert body. */
export interface RoomPricingUpsert {
  name: string;
  hourlyRate: number;
  currency: string;
  dayOfWeek?: number;
  /** HH:mm:ss */
  startTime?: string;
  endTime?: string;
  /** yyyy-MM-dd */
  validFrom?: string;
  validTo?: string;
  priority?: number;
}

export const roomPricingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listPricingRules: build.query<RoomPricingRuleDto[], UUID>({
      query: (roomId) => ({ url: `/admin/rooms/${roomId}/pricing-rules`, method: "GET" }),
      providesTags: (_r, _e, roomId) => [{ type: "Room", id: `PRICING-${roomId}` }],
    }),
    createPricingRule: build.mutation<RoomPricingRuleDto, { roomId: UUID; body: RoomPricingUpsert }>({
      query: ({ roomId, body }) => ({ url: `/admin/rooms/${roomId}/pricing-rules`, method: "POST", data: body }),
      invalidatesTags: (_r, _e, a) => [{ type: "Room", id: `PRICING-${a.roomId}` }],
    }),
    updatePricingRule: build.mutation<
      RoomPricingRuleDto,
      { roomId: UUID; ruleId: UUID; body: RoomPricingUpsert }
    >({
      query: ({ roomId, ruleId, body }) => ({
        url: `/admin/rooms/${roomId}/pricing-rules/${ruleId}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (_r, _e, a) => [{ type: "Room", id: `PRICING-${a.roomId}` }],
    }),
    deletePricingRule: build.mutation<void, { roomId: UUID; ruleId: UUID }>({
      query: ({ roomId, ruleId }) => ({
        url: `/admin/rooms/${roomId}/pricing-rules/${ruleId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, a) => [{ type: "Room", id: `PRICING-${a.roomId}` }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListPricingRulesQuery,
  useCreatePricingRuleMutation,
  useUpdatePricingRuleMutation,
  useDeletePricingRuleMutation,
} = roomPricingApi;
