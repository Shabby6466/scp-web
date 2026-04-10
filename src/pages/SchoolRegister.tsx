import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { schoolService } from "@/services/schoolService";
import { branchService } from "@/services/branchService";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Building2, FileText, MapPin } from "lucide-react";
import { SchoolBranchesManager, SchoolBranch } from "@/components/admin/SchoolBranchesManager";

const schoolSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(20),
  address: z.string().min(5, "Address is required").max(200),
  city: z.string().min(2, "City is required").max(50),
  state: z.string().default("NY"),
  zip_code: z.string().min(5, "ZIP code must be at least 5 digits").max(10),
  website: z.string()
    .optional()
    .or(z.literal(""))
    .transform((val) => {
      if (!val) return "";
      if (val && !val.match(/^https?:\/\//i)) {
        return `https://${val}`;
      }
      return val;
    })
    .pipe(
      z.string().url("Must be a valid URL (e.g., yourschool.com or www.yourschool.com)").optional().or(z.literal(""))
    ),
  license_number: z.string().min(1, "License number is required").max(50),
  certification_number: z.string().optional(),
  min_age: z.coerce.number().min(0, "Minimum age must be at least 0").max(10),
  max_age: z.coerce.number().min(0, "Maximum age must be at least 0").max(18),
  total_capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").default("#FFA500"),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

const SchoolRegister = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState<SchoolBranch[]>([
    {
      branch_name: "Main Location",
      address: "",
      city: "",
      state: "NY",
      zip_code: "",
      phone: "",
      email: "",
      min_age: 2,
      max_age: 5,
      total_capacity: 50,
      is_primary: true,
    }
  ]);

  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: user?.name || "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "NY",
      zip_code: "",
      website: "",
      license_number: "",
      certification_number: "",
      min_age: 2,
      max_age: 5,
      total_capacity: 50,
      primary_color: "#FFA500",
    },
  });

  const onSubmit = async (data: SchoolFormData) => {
    if (!user) {
      toast.error("You must be logged in to register a school");
      navigate("/auth");
      return;
    }

    if (branches.length === 0) {
      toast.error("Please add at least one location");
      return;
    }

    const incompleteBranches = branches.filter(b => 
      !b.branch_name || !b.address || !b.city || !b.zip_code || !b.phone
    );
    
    if (incompleteBranches.length > 0) {
      toast.error("Please complete all required fields for each location");
      return;
    }

    setIsSubmitting(true);

    try {
      const school = await schoolService.create({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zip_code,
        website: data.website || null,
        licenseNumber: data.license_number,
        certificationNumber: data.certification_number || null,
        minAge: data.min_age,
        maxAge: data.max_age,
        totalCapacity: data.total_capacity,
        primaryColor: data.primary_color,
      });

      await Promise.all(
        branches.map(branch =>
          branchService.create({
            schoolId: school.id,
            name: branch.branch_name,
            address: branch.address,
            city: branch.city,
            state: branch.state,
            zipCode: branch.zip_code,
            phone: branch.phone,
            email: branch.email || null,
            minAge: branch.min_age,
            maxAge: branch.max_age,
            totalCapacity: branch.total_capacity,
            isPrimary: branch.is_primary,
            notes: branch.notes || null,
          })
        )
      );

      toast.success("School registered successfully!");
      navigate("/school-application");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register school");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header hideParentPortal />
      <main className="flex-1 pt-20 pb-12">
        <div className="container max-w-4xl px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-display">Register Your School</CardTitle>
              <CardDescription className="text-base">
                Join PreSchool Portal and streamline your documentation process. Your application will be reviewed by our admin team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Basic Information
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Manhattan Schoolhouse" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="admin@school.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="(212) 555-0123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="yourschool.com or www.yourschool.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter your website URL (https:// will be added automatically)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Address
                    </h3>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address *</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main Street" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input placeholder="New York" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State *</FormLabel>
                            <FormControl>
                              <Input placeholder="NY" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="zip_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code *</FormLabel>
                            <FormControl>
                              <Input placeholder="10001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Licensing */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Licensing & Certification
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="license_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NYC DOH License Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="DOH-12345" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="certification_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Certification Number</FormLabel>
                            <FormControl>
                              <Input placeholder="CERT-67890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* School Branches/Locations */}
                  <SchoolBranchesManager 
                    branches={branches} 
                    onChange={setBranches}
                    defaultState={form.watch("state")}
                  />

                  {/* Branding */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Branding (Optional)</h3>
                    
                    <FormField
                      control={form.control}
                      name="primary_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Color</FormLabel>
                          <div className="flex gap-4 items-center">
                            <FormControl>
                              <Input type="color" className="w-20 h-10" {...field} />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">{field.value}</span>
                          </div>
                          <FormDescription>Choose your school's primary brand color</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      * Required fields. Your registration will be reviewed by our admin team within 1-2 business days.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-secondary hover:bg-secondary/90 font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Registering..." : "Register School"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SchoolRegister;
