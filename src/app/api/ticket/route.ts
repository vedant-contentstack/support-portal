import { NextRequest, NextResponse } from "next/server";

// HubSpot API configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_API_URL = "https://api.hubapi.com";

// Map priority to HubSpot priority values
const priorityMap: Record<string, string> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  urgent: "HIGH",
};

// Map our categories to HubSpot allowed categories
// HubSpot allows: PRODUCT_ISSUE, BILLING_ISSUE, FEATURE_REQUEST, GENERAL_INQUIRY
const categoryMap: Record<string, string> = {
  technical: "PRODUCT_ISSUE",
  billing: "BILLING_ISSUE",
  account: "GENERAL_INQUIRY",
  feature: "FEATURE_REQUEST",
  integration: "PRODUCT_ISSUE",
  other: "GENERAL_INQUIRY",
};

// Create or update HubSpot contact
async function createOrUpdateHubSpotContact(
  email: string,
  name: string
): Promise<string | null> {
  if (!HUBSPOT_API_KEY) return null;

  const nameParts = name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  try {
    // Try to create contact
    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          email,
          firstname: firstName,
          lastname: lastName,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.id;
    }

    // If contact exists (409 conflict), search for it
    if (response.status === 409) {
      const searchResponse = await fetch(
        `${HUBSPOT_API_URL}/crm/v3/objects/contacts/search`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "email",
                    operator: "EQ",
                    value: email,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.results?.[0]?.id) {
          return searchData.results[0].id;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("HubSpot contact error:", error);
    return null;
  }
}

// Create HubSpot ticket
async function createHubSpotTicket(
  subject: string,
  description: string,
  category: string,
  priority: string,
  contactId: string | null
): Promise<{ id: string; success: boolean } | null> {
  if (!HUBSPOT_API_KEY) return null;

  try {
    const ticketData: {
      properties: Record<string, string>;
      associations?: Array<{
        to: { id: string };
        types: Array<{
          associationCategory: string;
          associationTypeId: number;
        }>;
      }>;
    } = {
      properties: {
        subject: subject,
        content: description,
        hs_pipeline: "0", // Default pipeline
        hs_pipeline_stage: "1", // New ticket stage
        hs_ticket_priority: priorityMap[priority] || "MEDIUM",
        hs_ticket_category: categoryMap[category] || "GENERAL_INQUIRY",
      },
    };

    // Associate with contact if we have one
    if (contactId) {
      ticketData.associations = [
        {
          to: { id: contactId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 16, // Ticket to Contact
            },
          ],
        },
      ];
    }

    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ticketData),
    });

    if (response.ok) {
      const data = await response.json();
      return { id: data.id, success: true };
    }

    const errorData = await response.json();
    console.error("HubSpot ticket creation failed:", errorData);
    return null;
  } catch (error) {
    console.error("HubSpot ticket error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, email, category, priority, subject, description } = body;

    // Validate required fields
    if (!name || !email || !category || !subject || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate internal ticket ID
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const createdAt = new Date().toISOString();

    let hubspotTicketId: string | null = null;

    // Create ticket in HubSpot if configured
    if (HUBSPOT_API_KEY) {
      // First, create or get contact
      const contactId = await createOrUpdateHubSpotContact(email, name);

      // Then create ticket
      const hubspotResult = await createHubSpotTicket(
        `[${ticketId}] ${subject}`,
        `**Customer:** ${name}\n**Email:** ${email}\n**Category:** ${category}\n**Priority:** ${
          priority || "medium"
        }\n\n---\n\n${description}`,
        category,
        priority || "medium",
        contactId
      );

      if (hubspotResult) {
        hubspotTicketId = hubspotResult.id;
        console.log(`✅ HubSpot ticket created: ${hubspotTicketId}`);
      }
    }

    // Zapier webhook (optional backup)
    const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    if (zapierWebhookUrl) {
      try {
        await fetch(zapierWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ticket_id: ticketId,
            hubspot_ticket_id: hubspotTicketId,
            customer_name: name,
            customer_email: email,
            category,
            priority,
            subject,
            description,
            created_at: createdAt,
          }),
        });
      } catch (zapierError) {
        console.error("Zapier webhook failed:", zapierError);
      }
    }

    return NextResponse.json({
      success: true,
      ticket_id: ticketId,
      hubspot_ticket_id: hubspotTicketId,
      message: "Ticket created successfully",
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Support ticket API is running",
  });
}
