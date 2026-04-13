import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users } from 'lucide-react';

const RoleSelection = () => {
  const navigate = useNavigate();

  const roles = [
    {
      type: 'school',
      title: 'School / Institution',
      description: 'Register your preschool or daycare to manage compliance',
      icon: Building2,
      color: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
      path: '/institution-auth',
      buttonText: 'Apply as School'
    },
    {
      type: 'parent',
      title: 'Parent / Guardian',
      description: 'Access your child\'s document portal and upload records',
      icon: Users,
      color: 'bg-primary text-primary-foreground hover:bg-primary/90',
      path: '/auth',
      buttonText: 'Sign In as Parent'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground">
              Get Started with Compli-ed
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select your role to access the appropriate portal
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Card
                  key={role.type}
                  className="border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <CardHeader className="text-center pb-6">
                    <div className="flex justify-center mb-4">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${role.type === 'school' ? 'bg-secondary/15' : 'bg-primary/15'}`}>
                        <Icon className={`h-8 w-8 ${role.type === 'school' ? 'text-secondary' : 'text-primary'}`} />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-serif text-foreground">
                      {role.title}
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                      {role.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      className={`w-full font-semibold ${role.color}`}
                      size="lg"
                      onClick={() => navigate(role.path)}
                    >
                      {role.buttonText}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Need help choosing? <a href="/faq" className="text-primary hover:underline">Visit our FAQ</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
